const fs = require('fs');
const readline = require('readline');
const split = require('split');
const { google, calendar_v3 } = require('googleapis');
const Discord = require('discord.js');
const { start } = require('repl');
const client = new Discord.Client();

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Calendar API.
    authorize(JSON.parse(content), listEvents);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
var summary;
var hangoutLink;
var location;
var icallNumber;
var icallPass;
var timeNow = new Date();
var minutes = 30;
var add_minutes = new Date(timeNow.getTime() + minutes * 20000);
var eventFound = 0;

function listEvents(auth) {
    const calendar = google.calendar({ version: 'v3', auth });
    calendar.calendarList.list({
        selected: "true",
        maxResults: 100
    },
        function (err, result) {
            result.data.items.forEach(element => {
                calendar.events.list({
                    calendarId: element.id,
                    timeMin: timeNow,
                    timeMax: add_minutes,
                    maxResults: 1,
                    singleEvents: true,
                    orderBy: 'startTime',
                }, (err, res) => {
                    if (err) return console.log('The API returned an error: ' + err);
                    const events = res.data.items;
                    eventFound = events.length;
                    if (events.length) {
                        events.map((event, i) => {
                            summary = event.summary;
                            hangoutLink = event.hangoutLink;
                            location = event.location;
                            icallNumber = event.conferenceData.entryPoints[1]['label'];
                            icallPass = event.conferenceData.entryPoints[1]['pin'];
                            if (eventFound <= 0) {
                                console.log('ERR1 # [Aucun évènement trouvé]');
                            } else {

                                client.on("ready", function () {
                                    console.log("\x1b[32m", "Connexion du bot au serveur réussie...");
                                    const channelName = "liens-meet";
                                    const channel = client.channels.cache.find(channel => channel.name === channelName)
                                    channel.bulkDelete(100);
                                    if (channel.bulkDelete(100)) {
                                        console.log('\x1b[36m%s\x1b[0m', "Derniers messages supprimés avec succès");
                                    } else {
                                        console.log('\x1b[5m', '\x1b[31m', "Derniers messages supprimés avec succès");
                                    }
                                    channel.send(
                                        ":book: **Début du cours dans quelques minutes : **" + summary + "\n:link: **Lien pour accéder au Google Meet : **" + hangoutLink + "\n:mobile_phone: **Accès téléphone au : **" + icallNumber + ", mot de passe : " + icallPass + "\n:classical_building: **Lieu du cours :** " + location + " @everyone"
                                    );
                                })
                                client.login("TOKEN_BOT");
                                console.log(
                                    "🗒  Début du cours dans quelques minutes : " + summary + "\n",
                                    "📢  Adresse pour accéder au Google Meet : " + hangoutLink + "\n",
                                    "📞  Accès téléphone au : " + icallNumber + ", mot de passe : " + icallPass + "\n",
                                    "🏛  Lieu du cours : " + location + ""
                                );
                            }
                        });
                    } else {
                    }
                });
            });
        });
}
