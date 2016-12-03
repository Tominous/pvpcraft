/**
 * Created by macdja38 on 2016-09-01.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

module.exports = class feedManager {
  constructor(e) {
    //save the client as this.client for later use.
    this._client = e.client;
    //save the bug reporting thing raven for later use.
    this._feeds = e.feeds;
  }

  getCommands() {
    //this needs to return a list of commands that should activate the onCommand function
    //of this class. array of strings with trailing s's removed.
    return ["feed", "find"];
  }

  onReady() {

  }

  onDisconnect() {

  }

  //if this exists it will be called on every message unless it contains a command that is
  //consumed by another module.
  checkMisc(msg, perms) {
    return false;
  }

  onCommand(msg, command, perms) {
    //log that the module was called.
    if(!msg.server) return;
    //check if this is a command we should handle and if the user has permissions to execute it.
    if (command.commandnos === "feed" && perms.check(msg, "feeds.manage")) {
      let adding;
      switch(command.args[0]) {
        case "start":
          adding = true;
          break;
        case "stop":
          adding = false;
          break;
        default:
          msg.reply(`Usage ${command.prefix}${command.command} <start|stop> <node>[ --channel <channel>]`);
          return true;
      }
      if(!command.args[1]) {
        msg.reply(`Usage ${command.prefix}${command.command} <start|stop> <node>[ --channel <channel>]`);
        return true;
      }
      let channel = command.channel;
      if (command.options.hasOwnProperty("webhook")
        && /https:\/\/(?:ptb.|canary\.)?discordapp\.com\/api\/webhooks\/(\d+)\/(.+)/.test(command.options.webhook)) {
        let matches = command.options.webhook
          .match(/https:\/\/(?:ptb.|canary\.)?discordapp\.com\/api\/webhooks\/(\d+)\/(.+)/i);
        channel = {
          id:`https://discordapp.com/api/webhooks/${matches[1]}/${matches[2]}`,
          server: {id: msg.server.id},
          mention: function mention() {
            return `another Discord`;
          }
        };
      }
      else if(!channel) {
        channel = msg.channel;
      }
      this._feeds.set(adding, utils.stripNull(command.args[1].toLowerCase()), channel.id, channel.server.id);
      msg.reply(`${adding ? "Starting" : "Stopping"} ${command.args[1].toLowerCase()} in channel ${channel.mention()}`);

      //return true, which tells the command dispatcher that we processed the command.
      return true;
    }

    if (command.command === "find" && perms.check(msg, "feeds.find")) {
      let server = msg.server.id;
      if(!command.args[0]) {
        msg.reply(`Usage ${command.prefix}${command.command} <node>`)
      }
      msg.reply(this._feeds.find(command.args[0].toLowerCase()).map(channelId => msg.server.channels.get("id", channelId) || channelId));
    }
    //return false, telling the command dispatcher the command was not handled and to keep looking,
    //or start passing it to misc responses.
    return false;
  }
};