"use strict";
require('dotenv').config()
const axios = require("axios");
const mysql_pool = require('./db');
const ApibaseUrl = require('./db');
const cron = require('node-cron');
const matchType1 = require('./db');
const MatchProcess = require('./models/processmatches');


let tatalRecord = (playerId, matchId, connection, totalPoint, iscap, isvcap,matchType) => {
    return new Promise(async function (resolve, reject) {

        let query1 = 'select * from matchplrptstotal where pid  = "' + playerId + '" AND matchid = "' + matchId + '"';
        console.log("----", query1);
        connection.query(query1, async function (error, results, fields) {
          try{
            if (error) {
                console.log(new Date())
                console.log("connection down at", error);
              } else if (results.length > 0) {
              let api_url = (ApibaseUrl.ApibaseUrl.baseUrl) + "/getglobalpoints";
              var response = await axios.post(api_url, {
                  gametype: 'football'
              });
              if (response) {
                  let fantasypoints = response.data.data.football[matchType]
                  let playerTotalPoint = (iscap == 1) ? (parseFloat(results[0].total) * parseFloat(fantasypoints["cap"])) : (isvcap == 1) ? (parseFloat(results[0].total) * parseFloat(fantasypoints["vcap"])) : parseFloat(results[0].total)
                resolve(playerTotalPoint);
             }
            } else {
                resolve(0);
                console.log("there are not matching match Id");
            }
          }catch(e){
            console.log("error===>",e);
          }
        })

    })
}
var updatePoints = (totalPoint, teamid, connection) => {
    return new Promise(function (resolve, reject) {
        let query2 = 'update  joincontests set ptotal = "' + totalPoint + '" where uteamid = "' + teamid + '"';

        connection.query(query2, function (error, results, fields) {
            if (error) {
                console.log(new Date())
                console.log("connection down at", error);
            } else if (results) {
                resolve(results);
            }
        })
    })
}
var saveNewmatches = async (req, res) => {
    try {
        (mysql_pool.mysql_pool).getConnection(async function (err, connection) {
            try {
                if (err) {
                    console.log(' Error getting mysql_pool connection: ' + err);
                } else {
                    //let matchidUrl = (ApibaseUrl.ApibaseUrl.baseUrl) + '/getlivematches';
                    //var matchidarr = await axios.post(matchidUrl);
                    MatchProcess.find({"pointteamstatus":0,"gameid":2}, async function (errormatchidarr, matchidarr, fieldsmatchidarr) {
                        if (matchidarr && matchidarr.length>0) {
                            //let matchArr = matchidarr.data.data;
                            let matchArr = matchidarr;
                            if (matchArr) {
                                for (let l = 0; l < matchArr.length; l++) {
                                    let matchId = matchArr[l].matchid

                                    ///////
                                    if(matchArr[l].mongosavestatus===1 && matchArr[l].plyrfntyptstatus===1)
                                    {
                                        MatchProcess.updateOne({"matchid":matchId},{"$set":{"pointteamstatus":1}},function(eeee,rrr){
                                        });
                                    }
                                    //////////                                    
                                    let api_url = (ApibaseUrl.ApibaseUrl.baseUrl) + '/getcontestteamandplayernode';
                                    var response = await axios.post(api_url, {
                                        "matchid": matchId
                                    });
                                    console.log("api_url--->>>",api_url);
                                    if (response && response.data && response.data.error==false) {
                                        let typeObject = matchType1.matchType;                                        
                                        let result = response.data.data;
                                        let details = response.data.details;
                                        let matchType =  typeObject[details.mtype]
                                        if (result){
                                            for (let i = 0; i < result.length; i++) {
                                                let teamid = result[i].uteamid;
                                                let matchid = result[i].matchid;
                                                let playerArr = result[i].players;
                                                let totalPoint = 0;
                                                let k = 1;
                                                for (let j = 0; j < playerArr.length; j++) {
                                                    let iscap = playerArr[j].iscap;
                                                    let isvcap = playerArr[j].isvcap;
                                                    tatalRecord(playerArr[j].pid, matchid, connection, totalPoint, iscap, isvcap,matchType).then(data => {
                                                        totalPoint = totalPoint + parseFloat(data);

                                                        if (playerArr.length == k) {
                                                            console.log("totalPointtotalPointtotalPoint--", totalPoint)
                                                            updatePoints(totalPoint, teamid, connection).then(res => {
                                                                console.log("update suscessfully");
                                                            }).catch(e => {
                                                                console.log("there are the error", e);
                                                            })
                                                        }
                                                        k++;
                                                    }).catch(e => {
                                                        console.log("there are the error", e);
                                                    })
                                                }
                                            }
                                        }

                                        ///////
                                    }
                                }
                            } else {
                                console.log("Active match id not found");
                            }
                        } else {
                            console.log("Active match id not found");
                        }
                    })
                }
                connection.release();
                console.log("connection relese successfully");
            } catch (e) {
                console.log("there are the error---", e);
            }
        })
    } catch (e) {
        console.log("error catch", e);
    }
}

cron.schedule('*/2 * * * *', () => {
    saveNewmatches();
})