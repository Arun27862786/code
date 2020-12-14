"use strict";
require('dotenv').config()
const axios = require("axios");
const ApibaseUrl = require('./db');
const fs = require("fs");
const cron = require('node-cron');
const mysql_pool = require('./db');
const MatchProcess = require('./models/processmatches');
const CompleteMatch = require('./completematch.js');

let getMatchPlayers = (matchid, connection) => {
    return new Promise(function (resolve, reject) {
        let sql = "SELECT pid,playertype FROM matchmeta where matchid='" + matchid + "'";
        connection.query(sql, function (error, results, fields) {
            if (error) {
                console.log("connection down at", error);
            } else if (results) {
                resolve(results);
            }
        });
    })
}


var saveNewmatches = async (req, res) => {
    (mysql_pool.mysql_pool).getConnection(async function (err, connection) {
        try {
            if (err) {
                console.log(' Error getting mysql_pool connection: ' + err);
            } else {
                MatchProcess.find({ "plyrfntyptstatus": 0,"gameid":2 }, async function (errormatchidarr, resultMP, fieldsmatchidarr) {
                    if (resultMP.length > 0) {


                        resultMP.forEach((itemMP,indexMP) => {
                            let matchid = itemMP.matchid;
                            //console.log("itemMP==============--->>",itemMP)
                            if(itemMP.mongosavestatus===1)
                            {
                                MatchProcess.updateOne({"matchid":matchid},{"$set":{"plyrfntyptstatus":1}},function(eeee,rrr){
                                });
                            }
                            
                            CompleteMatch.findOne({ "matchid": matchid }, async function (errormatchidarr, resultMP, fieldsmatchidarr) {
                                if (resultMP) {
                                    let itemCompMatch = resultMP;

                                    let matchid = itemCompMatch.matchid;
                                    let matchPlayers = await getMatchPlayers(matchid, connection);
                                    //console.log("matchid ===>", matchid);
                                    try {
                                        console.log("itemCompMatch.type------->>>",itemCompMatch.type);
                                        
                                        let teamA = itemCompMatch.match.match.home;
                                        let teamB = itemCompMatch.match.match.away;

                                        let arrayAllTeamIds = itemCompMatch.match.players; 
                                        let arrayplaying11a = itemCompMatch.match.teams[teamA].lineup;
                                        let arrayplaying11b = itemCompMatch.match.teams[teamB].lineup;

                                        let arrayBenchA     = itemCompMatch.match.teams[teamA].bench;
                                        let arrayBenchB     = itemCompMatch.match.teams[teamB].bench;

                                        let benchAll        = arrayBenchA.concat(arrayBenchB);  

                                        let arrayplaying11all = arrayplaying11a.concat(arrayplaying11b);
                                        
                                        arrayplaying11all = arrayplaying11all.concat(benchAll);

                                        let smatchType =ApibaseUrl.matchType[itemCompMatch.type]; //Contents.type;

                                        
                                        //console.log(ApibaseUrl.ApibaseUrl.baseUrl, ", matchType  === >", smatchType);
                                        
                                        let api_url = (ApibaseUrl.ApibaseUrl.baseUrl) + "/getglobalpoints";
                                        //console.log("api_url------------------>>>",api_url);
                                        
                                        
                                        var response = await axios.post(api_url, {
                                            gametype: 'football'
                                        });
                                        if (response) {
                                            console.log("response----->>>>>>>",response.data.data);
                                            
                                            // let fantasypoints = response.data.data.cricket[matchType];
                                            let fantasypoints = response.data.data.football[smatchType];
                                            //console.log(smatchType,"=response.data.data.cricket[matchType] ===>", JSON.stringify(response.data.data.cricket[smatchType]));
                                            let fPoint = await calculatePointEarn(arrayplaying11all,arrayAllTeamIds, fantasypoints, connection, matchid, smatchType, matchPlayers);
                                            //////////////Condition Required//// plyrfntyptstatus=1/////////////////////



                                            if (fPoint) {
                                               // console.log("points update successfully");
                                            }
                                        }

                                    } catch (e) {
                                        console.log("error -----", e);
                                    }

                                   

                                } else {
                                    console.log("not any active match id="+matchid);

                                }
                            })

                           
                        })

                    }
                })
            }
            connection.release();
            console.log("connection relese successfully");
        } catch (e) {
            console.log("error ==>>>>>>", e);

        }
    })
}



let calculatePointEarn = (arrayplaying11all,arrayAllTeamIds, fantasypoints, connection, matchid, matchType, matchPlayers) => {
    return new Promise(function (resolve, reject) {
//console.log("0000000000000------>>>",arrayplaying11all,arrayAllTeamIds, fantasypoints, connection, matchid, matchType, matchPlayers);
let pointList = {};
        let globalArr = {};
        //Object.values(arrayAllTeamIds).map(async function (itemPerPlayer, indexResult) {
            arrayplaying11all.map(async function (itemPlayerID, indexResult) {
                console.log("fantasypoints--->>>",fantasypoints);
            try {
                
                let itemPerPlayer = arrayAllTeamIds[itemPlayerID];
                let totalpoints   = 0;
                let playerid      = itemPlayerID;
                
                let playing         = 0;
                let goal            = 0;
                let assist          = 0;
                let cleansheet      = 0;
                let penaltysave     = 0;
                let yellowcard      = 0;
                let redcard         = 0;
                let owngoal         = 0;    
                let goalsconceded   = 0;
                let penaltymissed   = 0;
                let tenpasses       = 0;
                let twoshottarget   = 0;
                let threegoalsaved  = 0;
                let threesucctackle = 0;
                let twoconceded     = 0;
                
                let name        = '';
                                            
                let totalrun = 0;
                let MYobj    = {};

                //////////////////////

                let plrType = matchPlayers.find(plr => (plr.pid === playerid));                 
                let playerRole = itemPerPlayer.role;
                let itemResult = itemPerPlayer.stats;
                name = itemPerPlayer["legal_name"];

                if(itemResult.minutes_played > 0){

                    if(itemResult.minutes_played >= 55){
                        playing  = playing + parseFloat(fantasypoints.playfiftyfivemin);
                    }else{
                        playing  = playing + parseFloat(fantasypoints.playlessfiftyfive);
                    }

                    if(plrType != undefined && plrType['playertype'] == 8) //GK
                    {                    
                        goal            = goal + parseFloat((itemResult["goal"].scored) ? (parseFloat(itemResult["goal"].scored) * parseFloat(fantasypoints.goalgk)) : 0);
                        goalsconceded   = goalsconceded + parseFloat((itemResult["goal"].conceded) ? (parseFloat(itemResult["goal"].conceded) * parseFloat(fantasypoints.goalsconcededgk)) : 0);
                        penaltysave     = penaltysave + parseFloat((itemResult["penalty"].saved) ? (parseFloat(itemResult["penalty"].saved) * parseFloat(fantasypoints.penaltysavegk)) : 0);
                        cleansheet      = cleansheet + parseFloat((itemResult["clean_sheet"]) ? parseFloat(fantasypoints.cleansheetgk) : 0);

                        let every3goalsaved=(itemResult["goal"].saved)?(parseInt(itemResult["goal"].saved)/3):0;
                        threegoalsaved  = threegoalsaved + parseFloat((every3goalsaved | 0) * parseFloat(fantasypoints.goalsaved));                        

                        let every2conceded=(itemResult["goal"].conceded)?(parseInt(itemResult["goal"].conceded)/3):0;
                        twoconceded  = twoconceded + parseFloat((every2conceded | 0) * parseFloat(fantasypoints.goalsconcededgk));
                    }
                    else if (plrType != undefined && plrType['playertype'] == 9) //DEF
                    {                    
                        goal        = goal + parseFloat((itemResult["goal"].scored) ? (parseFloat(itemResult["goal"].scored) * parseFloat(fantasypoints.goaldef)) : 0);
                        cleansheet  = cleansheet + parseFloat((itemResult["clean_sheet"]) ? parseFloat(fantasypoints.cleansheetdef) : 0);

                        let every2conceded=(itemResult["goal"].conceded)?(parseInt(itemResult["goal"].conceded)/3):0;
                        twoconceded  = twoconceded + parseFloat((every2conceded | 0) * parseFloat(fantasypoints.goalsconcededdef));
                    }
                    else if (plrType != undefined && plrType['playertype'] == 10) //MID
                    {
                        goal        = goal + parseFloat((itemResult["goal"].scored) ? (parseFloat(itemResult["goal"].scored) * parseFloat(fantasypoints.goalmid)) : 0);
                        cleansheet  = cleansheet + parseFloat((itemResult["clean_sheet"]) ? parseFloat(fantasypoints.cleansheetmid) : 0);
                    }
                    else if (plrType != undefined && plrType['playertype'] == 11) //FWD
                    {
                        goal  = goal + parseFloat((itemResult["goal"].scored) ? (parseFloat(itemResult["goal"].scored) * parseFloat(fantasypoints.goalfor)) : 0);
                    }

                    assist = assist + parseFloat((itemResult["goal"].assist) ? (parseFloat(itemResult["goal"].assist) * parseFloat(fantasypoints.assist)) : 0);
                    redcard     = redcard + parseFloat((itemResult["card"].RC) ? (parseFloat(itemResult["card"].RC) * parseFloat(fantasypoints.redcard)) : 0);
                    yellowcard  = yellowcard + parseFloat((itemResult["card"].YC) ? (parseFloat(itemResult["card"].YC) * parseFloat(fantasypoints.yellowcard)) : 0);
                    owngoal     = owngoal + parseFloat((itemResult["goal"].own_goal_conceded) ? (parseFloat(itemResult["goal"].own_goal_conceded) * parseFloat(fantasypoints.owngoal)) : 0);
                    penaltymissed  = penaltymissed + parseFloat((itemResult["penalty"].missed) ? (parseFloat(itemResult["penalty"].missed) * parseFloat(fantasypoints.penaltymissed)) : 0);

                    let everytenpass=(itemResult["passes"])?(parseInt(itemResult["passes"])/10):0;
                    tenpasses  = tenpasses + parseFloat((everytenpass | 0) * parseFloat(fantasypoints.passes));

                    let every2shottarget=(itemResult["shot_on_target"])?(parseInt(itemResult["shot_on_target"])/2):0;
                    twoshottarget  = twoshottarget + parseFloat((every2shottarget | 0) * parseFloat(fantasypoints.shotontarget));

                   

                    let every3succtackle=(itemResult["tackles"])?(parseInt(itemResult["tackles"])/3):0;
                    threesucctackle  = threesucctackle + parseFloat((every3succtackle | 0) * parseFloat(fantasypoints.tackles));
                    
                    
                    totalpoints = totalpoints + parseFloat(playing + goal + goalsconceded + penaltysave + cleansheet + assist + redcard + yellowcard + owngoal + penaltymissed + tenpasses +twoshottarget+threegoalsaved+threesucctackle+twoconceded);

                    pointList[playerid] = totalpoints;


                    let updatedata = await pointsRecord(totalpoints, playerid, matchid, connection)
                    if (updatedata) {
                       // console.log("there are the total point ", updatedata)
                    }
                }
            } catch (e) {
                console.log("there are the error", e);
            }

        })
  
        resolve(pointList);
    })
}

var pointsRecord = (totalPoints, playerId, matchId, connection) => {
    return new Promise(function (resolve, reject) {
        let query1 = 'select * from matchplrptstotal where matchid = "' + matchId + '" and pid  = "' + playerId + '"';

        connection.query(query1, function (error, results, fields) {
            if (error) {
                //console.log(new Date())
                console.log("connection down at", error);
            } else if (results.length > 0) {

                let updatequery = 'update matchplrptstotal  SET  total = "' + totalPoints + '" where pid = "' + playerId + '" AND matchid = "' + matchId + '"';
                //console.log("threre are the update query", updatequery);

                connection.query(updatequery, function (error, results, fields) {
                    if (error) {
                        console.log(new Date())
                        console.log("connection down at", error);
                    } else {
                        console.log("data update successfully -----");
                    }
                })
            } else {
                let insertquery = 'insert into matchplrptstotal(matchid,pid,total)values("' + matchId + '","' + playerId + '","' + totalPoints + '")';
                console.log("insertquery");
                connection.query(insertquery, function (error, results, fields) {
                    if (error) {
                        console.log(new Date())
                        console.log("connection down at", error);
                    } else {
                        console.log("data insert sucessfully");
                    }
                })
            }
        })
    })
}


cron.schedule('*/1 * * * *', () => {
 saveNewmatches();
});