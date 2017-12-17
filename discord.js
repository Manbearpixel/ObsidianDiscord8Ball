// Load up the discord.js library
const Discord = require("discord.js");
const Tipbot  = require('./lib/tipbot');

// This is your client. Some people call it `bot`, some people call it `self`,
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.
const client = new Discord.Client();

// Load config and settings
// config.token contains the bot's token
// config.prefix contains the message prefix.
const config    = require("./config.json");
const settings  = require("./settings.json");

const UsageFee = parseFloat(settings.useFee) + parseFloat(settings.txFee);

const Statements = [
  'What an interesting question...',
  'What a unique question...',
  'Ah! Interesting...',

  'That\'s what you want to ask? Okay...',
  'I feel like I\'ve answered this already...',
  'Is this a question from biz?',

  'This seems like fud...',
  'Are you putting me on?'
];

const MemeAnswers = [
  // Good
  'Pravik Pajeet sees a yes in the future',
  'Blackstone says without a doubt',
  'Jihan Wu has just informed me of a positive outcome',
  'Pixxl told me to say yes',
  'All signs point to ScottP saying yes',
  'Camsterb is giving me a thumbsup',
  'Sagemark is making the call to make this happen',
  'Most likely',
  'Outlook good',
  'You may rely on it',

  // Try again
  'Ask your mother if you want to ask!',
  'I cannot predict this right now',
  'Do not disturb me, I am posting fud on biz',
  'New phone, who dis?',
  'Sagemark has told me I cannot tell you',

  // Bad
  'Sagemark says no',
  'Pavik Pajeet doubts this',
  'Just asked biz and they said no',
  'Very doubtful',
  'I see pink wojacks in your future'
];

let busyThinking = false;

let arrayShuffle = (array) => {
  let currentIndex = array.length,
      temporaryValue,
      randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
};

client.on("ready", () => {
  // This event will run if the bot starts, and logs in, successfully.
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
  // Example of changing the bot's playing game to something useful. `client.user` is what the
  // docs refer to as the "ClientUser".

  client.user.setGame(`. Type !8ball and a question!`);
});

client.on("guildCreate", guild => {
  // This event triggers when the bot joins a guild.
  console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);

  let channels = guild.channels.array();
  for (let channel of channels) {
    if (channel.name === 'general') {
      channel.send(`*poofs*`);
      channel.send(`Ladies and Gentlemen, gather round! If you have a question or need some advice, I shall unlock your fortune for a simple price! Type **!8ball** followed by your question, and if you have ${UsageFee} ODN I'll be happy to give you a confession!`);
    }
  }

  client.user.setGame(`. Type !8ball and a question!`);
});

client.on("guildDelete", guild => {
  // this event triggers when the bot is removed from a guild.
  console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
  client.user.setGame(`on ${client.guilds.size} servers`);
});

// Create an event listener for new guild members
client.on('guildMemberAdd', member => {
  // Send the message to a designated channel on a server:
  const channel = member.guild.channels.find('name', 'member-log');
  // Do nothing if the channel wasn't found on this server
  if (!channel) return;
  // Send the message, mentioning the member
  channel.send(`Welcome to the server, ${member}! We have an Obsidian Tipbot available here, type \`!help\` for usage!`);
});

client.on("message", async message => {
  // This event will run on every single message received, from any channel or DM.

  // It's good practice to ignore other bots. This also makes your bot ignore itself
  // and not get into a spam loop (we call that "botception").
  if(message.author.bot) return;

  // Also good practice to ignore any message that does not start with our prefix,
  // which is set in the configuration file.
  if(message.content.indexOf(config.prefix) !== 0) return;

  // Here we separate our "command" name, and our "arguments" for the command.
  // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
  // command = say
  // args = ["Is", "this", "the", "real", "life?"]
  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  if(command === 'help') {
    message.channel.send(Tipbot.helpMessage());
  }

  if(command === '8ball') {

    if (busyThinking === true) {
      message.channel.send(`<@${message.author.id}> quiet! I must concentrate on another question...`);

      return true;
    }

    busyThinking = true;
    let userId = message.author.id;

    if (message.content.substr(-1, 1) === '!') {
      message.channel.send(`<@${userId}> Why must you shout!`);
    }
    else if (message.content.substr(-1, 1) === '?') {
      let rN1 = Math.random();
      let rStatement = Math.floor(rN1 * Statements.length);
      let randomStatement = Statements[rStatement];

      message.channel.send(`${randomStatement} To answer this question of yours for a small fee of \`${settings.useFee}\` ODN please react to this message with a 👍`)
      .then((Message) => {
        let collector = Message.createReactionCollector(
          (reaction, user) => {
            return !!(reaction.emoji.name === '👍' && user.id === userId)
          }
        );

        collector.on('collect', (ele, collect) => {
          message.channel.send('Allow me to mediate on this for a second...');

          try {
            let amount        = parseFloat(settings.useFee);
            let discordUserID = config.clientID;

            if (userId === discordUserID) {
              throw new Error('You cannot tip yourself!');
            }

            console.log(`userId :: ${userId}`);
            console.log(`discordUserID :: ${discordUserID}`);
            console.log(`amount :: ${amount}`);

            Tipbot.getOdnAddress(discordUserID)
            .then((RecipientOdnAddress) => {
              console.log(`attempting to send tip to ${RecipientOdnAddress}`)

              Tipbot.withdrawOdn(userId, RecipientOdnAddress, amount)
              .then((Status) => {
                console.log('...Withdraw STATUS', Status);
                if (Status.status == 'success') {
                  let rN2 = Math.random();

                  let rAnswer = Math.floor(rN2 * MemeAnswers.length);
                  let answer  = MemeAnswers[rAnswer];

                  message.channel.send(`<@${userId}> The answer you seek is...\n${answer}!`);
                  busyThinking = false;
                }
                else {
                  if (Status.message.indexOf('insufficient') !== -1) {
                    message.channel.send(`<@${userId}> I do not accept tulips! You must have enough ODN in your wallet to cover my fee of \`${settings.useFee}\` ODN!`);
                  }
                  else {
                    message.channel.send(`<@${userId}> I... I am unable to give you an answer right now!\n${Status.message}`);
                  }
                  busyThinking = false;
                }
              })
              .catch((err) => {
                console.log(err);
                message.channel.send(`<@${userId}> I... I am unable to give you an answer right now!`);
                busyThinking = false;
              });
            });
          } catch (err) {
            console.log(err);
            message.channel.send(`<@${userId}> I... I am unable to give you an answer right now!`);
            busyThinking = false;
          }
        });
      });
    }
    else {
      message.channel.send(`<@${userId}> Please ask me a proper question!`);
    }
  }
});

client.login(config.token);
