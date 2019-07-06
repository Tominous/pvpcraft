/**
 * Created by macdja38 on 2016-11-16.
 */
"use strict";

let ua = require('universal-analytics');

/**
 * @class Analytics
 * Google analytics tracking class
 */
class Analytics {
  /**
   *
   * @param {string} trackingId Google tracking id
   */
  constructor(trackingId) {
    this._trackingId = trackingId;
    this._userMap = new WeakMap([]);
  }

  addClient(client) {
    let firstInit = false;
    if (!this._client) {
      firstInit = true;
    }
    this._client = client;
    if (firstInit) {
      firstInit(this._client);
    }
  }

  /**
   * Records a node to google analytics
   * @param {User|Member} user
   * @param {string} node
   * @param {...*} args arguments that will be passed  to the pageview after the node
   */
  record(user, node, ...args) {
    if (!this._trackingId) return;
    let visitor;
    if (!this._userMap.has(user)) {
      visitor = ua(this._trackingId, user.id, {strictCidFormat: false});
      this._userMap.set(user, visitor);
    } else {
      visitor = this._userMap.get(user);
    }
    visitor.pageview(node.replace(/\./g, "/"), ...args).send();
  }
}

module.exports = Analytics;