"use strict";
require('dotenv').config()
const axios = require("axios");
const ApibaseUrl = require('./db');
const fs = require("fs");
const cron = require('node-cron');
const mongoose = require('mongoose');
const mkdirp = require('mkdirp');
const matchType1 = require('./db');
const connection = ApibaseUrl.mysql_pool;
const CompleteMatch = require('./completematch.js');
const MatchProcess = require('./models/processmatches');

console.log("teamlogourl===>>",ApibaseUrl.ApibaseUrl);
// mongoose.connect('mongodb://localhost/brfantasy', { useNewUrlParser: true })
var saveNewmatches = async (req, res) => {
    try {
        //let matchidUrl = (ApibaseUrl.ApibaseUrl.baseUrl) + '/getlivematches';
        
        //let matchidarr = await axios.post(matchidUrl);
        let matchidarr = await MatchProcess.find({"filesavestatus":0}); 
        console.log("matchidarr--->>>",matchidarr);
        if (matchidarr) {
            //let matchArr = matchidarr.data.data;
            
            let matchArr = matchidarr;
            
            if (matchArr) {
                for (let i = 0; i < matchArr.length; i++) {
                    let matchid = matchArr[i].matchid;
                    let response = await CompleteMatch.findOne({
                        "matchid": matchid,
                        //"isscorecomplete":{"$in":[null,1]}
                    });
                    if (response) {
                      //console.log("responseresponse",JSON.sresponse);
                    let json = response.match;
                      let matchStatus = "";
                      if(json.winner_team){
                        matchStatus = "Completed";
                        //CompleteMatch.updateOne({"matchid":matchid},{"$set":{"isscorecomplete": 1}},function(eeee,rrr){});
                        //////////
                        // MatchProcess.findOne({"matchid": matchid,"filesavestatus":2},function (errorComplete, resultComplete, fieldComplete) {
                        //     if(errorComplete)
                        //     {
                        //       console.log("errorComplete=", errorComplete);
                        //     }
                        //     else
                        //     {
                              //if(resultComplete && resultComplete.filesavestatus===2)

                              
                              if(matchArr && matchArr[i].mongosavestatus===6)
                              {
                                MatchProcess.updateOne({"matchid":matchid},{"$set":{"filesavestatus":1}},function(eeee,rrr){
                                });
                              }
                        //       else
                        //       {
                        //         MatchProcess.updateOne({"matchid":matchid},{"$set":{"filesavestatus":2}},function(eeee,rrr){
                        //         });
                        //       }
                        //     }
                        // })
                        ///////////
                      }else {
                          matchStatus = "InProcess";
                        }


                        if(response.isscorecomplete==1)
                        {
                            CompleteMatch.updateOne({"matchid":matchid},{"$set":{"isscorecomplete": 2}},function(eeee,rrr){
                            });
                        }

                    if (!fs.existsSync('/home/JsonFile/matchid' + matchid)) {
                    // if(json.team && json.team[0].players.length  == 11 || json.team[0].players.length  == 13)
                    // {//change
                        mkdirp('/home/JsonFile/matchid' + matchid, async function(err) {
                            try {
                                if (err) {
                                    console.log("err---", err)
                                } else {
                                    var createStream = await fs.createWriteStream('/home/JsonFile/matchid' + matchid + '/' + matchid + '.json');
                                    if (createStream) {
                                            let typeObject = matchType1.matchType;
                                            let matchType = response.type;
                                            matchType = typeObject[matchType];
                                            let team1 = json.team[0].players;
                                            let team2 = json.team[1].players;
                                            let teamname1  = json.team[0].name;
                                            let teamname2  = json.team[1].name;
                                            let allteamids = team1.concat(team2);
                                            let battingteam = json.batting;
                                            let allteamplayer = [];
                                            battingteam.map(function(itemBatting, indexBatting) {
                                                allteamplayer = allteamplayer.concat(itemBatting.scores);
                                            })

                                            let bowlingteam = json.bowling;
                                            bowlingteam.map(function(itemBowling, indexBowling) {
                                                allteamplayer = allteamplayer.concat(itemBowling.scores);
                                            })

                                            let fieldingteam = json.fielding;
                                            fieldingteam.map(function(itemFielding, indexFielding) {
                                                allteamplayer = allteamplayer.concat(itemFielding.scores);
                                            })

                                            let arrayAllTeamIds = {};
                                            allteamids.map(function(itemAllTeam, indexAllTeam) {
                                                arrayAllTeamIds[itemAllTeam.pid] = ((allteamplayer.filter(x => x.pid == itemAllTeam.pid)).length > 0 ? (allteamplayer.filter(x => x.pid == itemAllTeam.pid)) : ([{
                                                    "playername": itemAllTeam.name
                                                }]))
                                            })
                                            let  teamname = {
                                              team1  : teamname1,
                                              team2  : teamname2
                                            }
                                            let saveData = {
                                                "matchid": matchid,
                                                "type": matchType,
                                                "matchStatus" : matchStatus,
                                                "teamname" : teamname,
                                                "modified": new Date(),
                                                "playerscore": arrayAllTeamIds
                                            }
                                            console.log("saveData =====>", saveData);
                                            createStream.write(JSON.stringify(saveData))
                                            createStream.end();
                                    }
                                }
                            } catch (e) {
                                console.log("error ==>>", e);
                            }
                        })
                    //   }else {
                    //     console.log("still team have not 11 player");
                    //   }
                    } else {
                        console.log("that is in else conditions=============");
                            let typeObject = matchType1.matchType;
                            let matchType = response.type;
                            matchType = typeObject[matchType];
                            let team1 = json.team[0].players;
                            let team2 = json.team[1].players;
                            let teamname1  = json.team[0].name;
                            let teamname2  = json.team[1].name;

                            let allteamids = team1.concat(team2);
                            let battingteam = json.batting;
                            let allteamplayer = [];
                            battingteam.map(function(itemBatting, indexBatting) {
                                allteamplayer = allteamplayer.concat(itemBatting.scores);
                            })
                            let bowlingteam = json.bowling;
                            bowlingteam.map(function(itemBowling, indexBowling) {
                                allteamplayer = allteamplayer.concat(itemBowling.scores);
                            })

                            let fieldingteam = json.fielding;
                            fieldingteam.map(function(itemFielding, indexFielding) {
                                allteamplayer = allteamplayer.concat(itemFielding.scores);
                            })


                            let arrayAllTeamIds = {};
                            allteamids.map(function(itemAllTeam, indexAllTeam) {
                                arrayAllTeamIds[itemAllTeam.pid] = ((allteamplayer.filter(x => x.pid == itemAllTeam.pid)).length > 0 ? (allteamplayer.filter(x => x.pid == itemAllTeam.pid)) : ([{
                                    "playername": itemAllTeam.name
                                }]))
                            })
                          let  teamname = {
                            team1  : teamname1,
                            team2  : teamname2
                          }
                            let saveData = {
                                "matchid": matchid,
                                "type": matchType,
                                "matchStatus" : matchStatus,
                                "modified": new Date(),
                                "teamname" : teamname,
                                "playerscore": arrayAllTeamIds
                            }
                            console.log("saveData =====>", saveData);
                            fs.writeFile('/home/JsonFile/matchid' + matchid + '/' + matchid + '.json', JSON.stringify(saveData), 'utf8', (err, data) => {
                                if (err) {
                                    console.log("there are the error", err);
                                }
                                console.log("data successfully write");
                            })
                    }
              }
              }
            } else {
                console.log("there are not any active matchId 1");

            }
        } else {
            console.log("there are not any active matchId 2");

        }
    } catch (e) {
        console.log("error catch", e);
    }
}

cron.schedule('*/1 * * * *', () => {
    saveNewmatches();
});
