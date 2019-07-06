const BaseDB = require("./BaseDB");
const chrono = require("chrono-node");
const utils = require("./utils");

const maxRetries = 3;

class taskQueue {
  constructor({ r, client, restClient, raven }) {
    this.client = client;
    this.restClient = restClient;
    this.raven = raven;
    this.db = new BaseDB(r);
    this.db.ensureTable("taskQueue");
    this.processQueue = this.processQueue.bind(this);
    this.runExpiredTasks = this.runExpiredTasks.bind(this);
    this.removeQueueEntry = this.removeQueueEntry.bind(this);
    this.processTask = this.processTask.bind(this);
    this.incrementRetries = this.incrementRetries.bind(this);
    if (!process.env.id || process.env.id === "0") {
      setInterval(this.runExpiredTasks, 1000);
    }
  }

  runExpiredTasks() {
    this.db.r.table("taskQueue").filter(r => r("expireTime").le(this.db.r.now())).then(this.processQueue);
  }

  processQueue(queue) {
    queue.forEach(this.processTask);
  }

  processTask(task) {
    return this.executeTask(task).then(() => this.removeQueueEntry(task)).catch((error) => this.incrementRetries(task, error));
  }

  incrementRetries(task, error) {
    if (error) {
      if (this.raven) {
        this.raven.captureException(error, { task: task });
      } else {
        console.error(error);
      }
    }
    let retries = task.retries || 0;
    if (retries > maxRetries) {
      return this.removeQueueEntry(task);
    } else {
      return this.db.r.table("taskQueue").get(task.id).update({retries: retries + 1}).run();
    }
  }

  executeTask(task) {
    switch (task.action) {
      case "unmute":
        return this.unmute(task.meta);
    }
  }

  removeQueueEntry({ id }) {
    this.db.r.table("taskQueue").get(id).delete().run();
  }

  estimateEndDateFromString(string) {
    const date = chrono.parseDate(`in ${string}`, Date.now(), { forwardDate: true });
    if (date) {
      return date;
    } else {
      throw new Error(`Cannot parse time of ${string}`)
    }
  }

  schedule(task, time) {
    if (typeof time === "string") {
      time = this.estimateEndDateFromString(time);
    } else if (time instanceof Date) {
      time = time.getTime() / 1000;
    }
    let datedTask = Object.assign({expireTime: this.db.r.epochTime(time)}, task);
    this.db.r.table("taskQueue").insert(datedTask).run();
  }

  async unmute(meta) {
    let options = { mute: false };
    if (meta.roleIDs) {
      let member;
      try {
        member = await this.restClient.getRESTGuildMember(meta.guildID, meta.userID);
      } catch (error) {
        console.error("From this place", error);
        throw error;
      }
      options.roles = member.roles.filter(rID => !meta.roleIDs.includes(rID));
    }
    return this.client.editGuildMember(meta.guildID, meta.userID, options, `Mute expired, mute reason: ${utils.clean(meta.reason)}`);
  }
}

module.exports = taskQueue;