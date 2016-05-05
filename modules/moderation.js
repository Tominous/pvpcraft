/**
 * Created by macdja38 on 2016-04-24.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

var colors = require('colors');

class Mod {
    constructor(cl, config) {
        this.client = cl;
        this.logging = {};
        this.config = config;

        //build the map of server id's and logging channels.
        for (var item in config.data) {
            if (config.data[item].hasOwnProperty("msgLog")) {
                this.logging[item] = this.client.channels.get("id", config.data[item]["msgLog"]);
            }
        }

        /**
         * log's a string to the server's log
         * @param server server to log string to
         * @param string string to send in server log
         */
        this.log = (server, string) => {
            if (this.logging.hasOwnProperty(server.id)) {
                console.log("server name " + server.name);
                this.client.sendMessage(this.logging[server.id], string, (error)=> {
                    console.error(error);
                    console.error(error.stack);
                });
            }
        };


        //log message deletes to the server's log channel
        this.logDelete = (message, channel) => {
            //check to see if it's a pm
            if (!channel.server) return;
            if (this.logging[channel.server.id]) {
                if (message) {
                    //grab url's to the message's attachments
                    console.log("Message Delete");
                    var string = utils.clean(channel.name) + " | " + utils.fullNameB(message.author) + " deleted:\n";
                    //if their's content log it.
                    if (message.content) {
                        if (message.content.length > 144 || /[^0-9a-zA-Z\s\.!\?]/.test(message.content)) {
                            string += utils.bubble(message.content);
                        } else {
                            string += "\n```diff\n-" + utils.clean(message.content) + "\n```";
                        }
                    }
                    //if their are attachments log them. maybe it's possible to attach more than one?
                    if (message.attachments) {
                        for (var i in message.attachments) {
                            string += message.attachments[i].proxy_url;
                            console.log("url: " + message.attachments[i].url);
                            console.log("proxy url: " + message.attachments[i].proxy_url);
                        }
                    }
                    //send everything off.
                    this.client.sendMessage(this.logging[channel.server.id], string, (error)=> {
                        console.error(error)
                    });
                }
                else {
                    this.client.sendMessage(this.logging[channel.server.id], "An un-cached message in " +
                        utils.clean(channel.name) + " was deleted, this probably means the bot was either recently restarted on the message was old.",
                        (error)=> {
                            console.error(error)
                        });
                }
            }
        };

        this.logUpdate = (message, newMessage) => {
            if (!newMessage.channel.server) return;
            var changeThresh = this.config.data[newMessage.channel.server.id];
            if (changeThresh) {
                if (changeThresh.changeThresh) {
                    changeThresh = changeThresh.changeThresh;
                }
                else {
                    changeThresh = this.config.get("default", {changeThresh: "1"}).changeThresh
                }
            }
            else {
                changeThresh = this.config.get("default", {changeThresh: "1"}).changeThresh
            }
            if (this.logging[newMessage.channel.server.id] && message.content !== newMessage.content) {
                console.log("Message Change");
                console.log(changeThresh);
                if (utils.compare(message.content, newMessage.content) > changeThresh) {
                    if (message.content.length > 144 || /[^0-9a-zA-Z\s\.!\?]/.test(message.content) || /[^0-9a-zA-Z\s\.!\?]/.test(newMessage.content)) {
                        this.client.sendMessage(this.logging[message.channel.server.id], utils.clean(newMessage.channel.name) +
                            " | " + utils.fullNameB(message.author) + " changed: " + utils.bubble(message.content) +
                            " to " + utils.bubble(newMessage.content), (error)=> {
                            console.error(error)
                        });
                    }
                    else {
                        this.client.sendMessage(this.logging[message.channel.server.id], utils.clean(newMessage.channel.name) +
                            " | " + utils.fullNameB(message.author) + "\n```diff\n-" + utils.clean(message.content) +
                            "\n+" + utils.clean(newMessage.content) + "\n```", (error)=> {
                            console.error(error)
                        });
                    }
                }
            }
        };

        this.logMember = (server, newUser, oldMember) => {
            console.log("Member Update");
            var newMember = server.detailsOfUser(newUser);
            if (oldMember.roles.length != newMember.roles.length /*|| oldMember.mute != newMember.mute || oldMember.deaf != newMember.deaf*/ || oldMember.nick != newMember.nick) {
                var text = ":exclamation:User change detected in " + utils.fullNameB(newUser) + "\n";
                if (oldMember.nick != newMember.nick) {
                    text += "        Nick changed from `" + utils.removeBlocks(oldMember.nick) + "` to `" + utils.removeBlocks(newMember.nick) + "`\n";
                }

                /* Changes to the following are not properly tracked by the lib and do not trigger member updates.
                 if (oldMember.mute != newMember.mute) {
                 text += "        Is-muted changed from `" + oldMember.mute + "` to `" + newMember.mute + "`\n";
                 }
                 if (oldMember.deaf != newMember.deaf) {
                 text += "        Is-deaf changed from `" + oldMember.deaf + "` to `" + newMember.deaf + "`\n";
                 }
                 */

                if (oldMember.roles.length < newMember.roles.length) {
                    var newRole = findNewRoles(newMember.roles, oldMember.roles);
                    if(newRole) {
                        text += "        Role added `" + newRole.name + "`\n";
                    } else {
                        console.error("Error adding new Role");
                        console.error(newMember.roles);
                        console.error(oldMember.roles);
                    }
                }
                else if (oldMember.roles.length > newMember.roles.length) {
                    var oldRole = findNewRoles(oldMember.roles, newMember.roles);
                    if(oldRole) {
                        text += "        Role removed `" + oldRole.name + "`\n";
                    } else {
                        console.error("Error finding removed Role");
                        console.error(newMember.roles);
                        console.error(oldMember.roles);
                    }
                }
                console.log("Member Update on " + server.name + " : " + text);
                if (this.logging.hasOwnProperty(server.id)) {
                    console.log("server name " + server.name);
                    this.client.sendMessage(this.logging[server.id], text, (error)=> {
                        console.error(error)
                    });
                }
            }
        };

        this.logMemberAdded = (server, user) => {
            this.log(server, ":inbox_tray: " + utils.fullName(user) + " Joined, id: `" + user.id + "`");
        };

        this.logMemberRemoved = (server, user) => {
            this.log(server, ":outbox_tray: " + utils.fullName(user) + " Left or was kicked, id: `" + user.id + "`");
        };

        this.logMemberBanned = (user, server) => {
            console.log("User " + user.username + " banned from " + server.name);
            this.log(server, ":exclamation::outbox_tray: " + utils.fullName(user) + " was Banned, id: `" + user.id + "`");
        };

        this.logMemberUnbanned = (user, server) => {
            console.log("User " + user.username + " unbanned from " + server.name);
            this.log(server, ":exclamation::inbox_tray: " + utils.fullName(user) + " was unbanned, id: `" + user.id + "`");
        };

        this.logRole = (oldRole, newRole) => {
            if (this.logging[newRole.server.id]) {
                console.log("Role change");
                var text = ":exclamation:Role change detected in " + utils.clean(oldRole.name) + "#" + oldRole.id + "\n";
                if (oldRole.permissions != newRole.permissions) {
                    text += "Permissions changed from " + (oldRole.permissions >>> 0).toString(2) + " to " + (newRole.permissions >>> 0).toString(2) + "\n";
                }
                if (oldRole.name != newRole.name) {
                    text += "Name changed from " + utils.clean(oldRole.name) + " to " + utils.clean(newRole.name) + "\n";
                }
                if (oldRole.position != newRole.position) {
                    text += "Position changed from " + oldRole.position + " to " + newRole.position + "\n";
                }
                if (oldRole.hoist != newRole.hoist) {
                    text += "Hoist changed from " + oldRole.hoist + " to " + newRole.hoist + "\n";
                }
                if (oldRole.color != newRole.color) {
                    text += "Colour changed from " + oldRole.color + " to " + newRole.color + "\n";
                }
                this.client.sendMessage(this.logging[newRole.server.id], text, (error)=> {
                    console.error(error)
                });
            }
        };

        this.logPresence = (oldUser, newUser) => {
            if (oldUser.username != newUser.username || oldUser.discriminator != newUser.discriminator || (oldUser.avatar != newUser.avatar && !newUser.bot)) {
                var text = ":exclamation:User change detected in " + utils.fullNameB(oldUser) + "\n";
                if (oldUser.username != newUser.username) {
                    text += "    Username changed from " + utils.removeBlocks(oldUser.username) + " to " + utils.removeBlocks(newUser.username) + "\n";
                }
                if (oldUser.discriminator != newUser.discriminator) {
                    text += "    Discriminator changed from " + oldUser.discriminator + " to " + newUser.discriminator + "\n";
                }
                if (oldUser.avatar != newUser.avatar && !newUser.bot) {
                    text += "    Avatar changed from " + oldUser.avatarURL + " to " + newUser.avatarURL + "\n";
                }
                console.log("User Change");
                for (var serverid in this.logging) {
                    if (this.client.servers.get("id", serverid).members.get("id", newUser.id)) {
                        console.log("server name " + this.client.servers.get("id", serverid).name);
                        this.client.sendMessage(this.logging[serverid], text, (error)=> {
                            console.error(error)
                        });
                    }
                }
            }
        };
        this.logChannelCreated = (channel) => {
            console.log("Channel " + channel.name + " created in " + channel.server.name);
            this.log(channel.server, ":exclamation:Channel " + utils.clean(channel.name) + " was created, id: `" + channel.id + "`");
        };
        this.logChannelUpdated = (oldChannel, newChannel) => {
            var text = ":exclamation:Channel change detected in " + utils.clean(oldChannel.name) + "\n";
            if (oldChannel.name != newChannel.name) {
                text += "        Name changed from `" + utils.removeBlocks(oldChannel.name) + "` to `" + utils.removeBlocks(newChannel.name) + "`\n";
            }
            if (oldChannel.topic != newChannel.topic) {
                text += "        Topic changed from `" + utils.removeBlocks(oldChannel.topic || null) + "` to `" + utils.removeBlocks(newChannel.topic) + "`\n";
            }
            //TODO: parse numbers into legible permissions.
            var changes = findOverrideChanges(oldChannel.permissionOverwrites, newChannel.permissionOverwrites);

            for(var change of changes) {
                var newTargetName;
                if(change.override.type === "member") {
                    newTargetName = utils.fullName(newChannel.server.members.get("id", change.override.id));
                }
                if(change.override.type === "role") {
                    newTargetName = utils.clean(newChannel.server.roles.get("id", change.override.id).name);
                }
                if(change.change == "remove" || change.change == "add") {
                    text += "        Channel override " + change.change + " from " + change.override.type + " " + newTargetName + "\n";
                }
                else{
                    text += "        Channel override on " + change.override.type + " " + newTargetName + " " +
                        change.change + " changed `" + (change.from >>> 0).toString(2) + "` to `" +
                        (change.to >>> 0).toString(2) + "`\n";
                }
            }
            if(text !== ":exclamation:Channel change detected in " + utils.clean(oldChannel.name) + "\n") {
                this.log(newChannel.server, text);
            }

        };
        this.logChannelDeleted = (channel) => {
            console.log("Channel " + channel.name + " deleted from " + channel.server.name);
            this.log(channel.server, ":exclamation:Channel " + utils.clean(channel.name) + " was deleted, id: `" + channel.id + "`");
        };
    }

    onDisconnect() {
        this.client.removeListener("presence", this.logPresence);
        this.client.removeListener("serverRoleUpdated", this.logRole);
        this.client.removeListener("serverMemberUpdated", this.logMember);
        this.client.removeListener("serverMemberAdded", this.logMemberAdded);
        this.client.removeListener("serverMemberRemoved", this.logMemberRemoved);
        this.client.removeListener("userBanned", this.logMemberBanned);
        this.client.removeListener("userUnbanned", this.logMemberUnbanned);
        this.client.removeListener("messageDeleted", this.logDelete);
        this.client.removeListener("messageUpdated", this.logUpdate);
        this.client.removeListener("channelCreated", this.logChannelCreated);
        this.client.removeListener("channelUpdated", this.logChannelUpdated);
        this.client.removeListener("channelDeleted", this.logChannelDeleted);
    }

    onReady() {
        this.client.on("presence", this.logPresence);
        this.client.on("serverRoleUpdated", this.logRole);
        this.client.on("serverMemberUpdated", this.logMember);
        this.client.on("serverNewMember", this.logMemberAdded);
        this.client.on("serverMemberRemoved", this.logMemberRemoved);
        this.client.on("userBanned", this.logMemberBanned);
        this.client.on("userUnbanned", this.logMemberUnbanned);
        this.client.on("messageDeleted", this.logDelete);
        this.client.on("messageUpdated", this.logUpdate);
        this.client.on("channelCreated", this.logChannelCreated);
        this.client.on("channelUpdated", this.logChannelUpdated);
        this.client.on("channelDeleted", this.logChannelDeleted);
        //TODO: log serverUpdated, serverRoleCreated, serverRoleDeleted
    }

    getCommands() {
        return ["setlog"];
    }

    checkMisc() {
        return false;
    }

    onCommand(msg, command, perms, l) {
        console.log("Moderation initiated");
        if (command.command == "setlog") {
            if (/<#\d+>/.test(command.options.channel) && perms.check(msg, "moderation.tools.setlog")) {
                console.log(this.config);
                this.logging[msg.channel.server.id] = this.client.channels.get("id", command.options.channel.match(/<#(\d+)>/)[1]);
                if (this.config.data[msg.channel.server.id]) {
                    this.config.data[msg.channel.server.id].msgLog = this.logging[msg.channel.server.id].id;
                } else {
                    this.config.data[msg.channel.server.id] = {msgLog: this.logging[msg.channel.server.id].id};
                }
                this.config.save();
                return true;
            } else {
                msg.reply("please properly define a channel to log using --channel #channelmention")
            }
        }
        return false;
    }
}

function findOverrideChanges(thing1, thing2) {
    var changes = [];
    if(thing1.length >= thing2.length) {
        console.log("removed");
        thing1.forEach(
            (i)=>{
                console.log(i);
                var j = thing2.get("id", i.id)
                if(j) {
                    for(var k in i) {
                        if(i[k] !== j[k]) {
                            changes.push({"change": k, "override": i, "from":i[k], "to":j[k]});
                        }
                    }
                }
                else {changes.push({"change": "remove", "override":i})}
            }
        );
    } else {
        thing2.forEach(
            (i)=>{
                console.log(i);
                if(!thing1.get("id", i.id)) {
                    changes.push({"change": "add", "override":i})}
            }
        );
    }
    return changes;
}

function findNewOverrides(more, less) {
    for (var i of more) {
        if (!less.get("id", i.id)) {
            return i;
        }
    }
    return false;
}

/**
 * return roles present in oldR that are not in newR
 * @param oldR
 * @param newR
 */
function findNewRoles(more, less) {
    for (var i of more) {
        if (!roleIn(i, less)) {
            return i;
        }
    }
    return false;
}

function roleIn(role, newRoles) {
    for (var j of newRoles) {
        if (role.id == j.id) {
            return true;
        }
    }
    return false;
}

module.exports = Mod;