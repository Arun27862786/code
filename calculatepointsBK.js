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
                MatchProcess.find({ "plyrfntyptstatus": 0,"gameid":1 }, async function (errormatchidarr, resultMP, fieldsmatchidarr) {
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
                                        //console.log("itemCompMatch.type------->>>",itemCompMatch.type);
                                        
                                        let arrayAllTeamIds = itemCompMatch.match.players; //Contents.playerscore;
                                        let arrayplaying11a = itemCompMatch.match.teams.a.match.playing_xi;
                                        let arrayplaying11b = itemCompMatch.match.teams.b.match.playing_xi;
                                        
                                        let arrayplaying11all=arrayplaying11a.concat(arrayplaying11b);
                                        

                                        let smatchType =ApibaseUrl.matchType[itemCompMatch.type]; //Contents.type;
                                        
                                        let api_url = (ApibaseUrl.ApibaseUrl.baseUrl) + "/getglobalpoints";
                                        
                                        var response = await axios.post(api_url, {
                                            gametype: 'cricket'
                                        });
                                        if (response) {                                        
                                            let fantasypoints = response.data.data.cricket[smatchType];
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


let calculatePointEarn = (arrayplaying11all,arrayAllTeamIds, fantasypoints,connection, matchid,matchType,matchPlayers) => {
    return new Promise(function (resolve, reject) {
        let pointList = {};
        let globalArr = {};
        let arrayThrowerPlyId=[];
        let arrayCatcherPlyId=[];
        // console.log("itemPerPlayer -----", arrayAllTeamIds);
        // return;
        //Object.values(arrayAllTeamIds).map(async function (itemPerPlayer, indexResult) {
            arrayplaying11all.map(async function (itemPlayerID, indexResult) {
            try {
              let itemPerPlayer=arrayAllTeamIds[itemPlayerID];
              let totalpoints = parseFloat(fantasypoints.playing);
              let trun=0;
              let tfour=0;
              let tsix=0;
              
             
              let tcatch1 = 0;
              let tstumped = 0;
              let name = '';
              let trunout  = 0;
              let totalrun = 0;
              let fiftyBonus  = 0;
              let hundredBonus = 0;
             
              let duck  = 0;
              
              let srone=0;
              let srtwo=0;
              let srthree=0;

              let twicket =0;
              let tmdnover =0;
              let tfourwhb   =0;
              let tfivewhb     =0;
              let terone     =0;
              let tertwo     =0;
              let terthree     =0;
              let terfour     =0;
              let terfive     =0;
              let tersix     =0;

              let MYobj = {};
              let playeingPoints =  parseFloat(fantasypoints.playing);
              let playerid =itemPlayerID;
              
              let inninglist = (itemPerPlayer.match && itemPerPlayer.match.innings) ? itemPerPlayer.match.innings : {};
              name =itemPerPlayer["fullname"];
                
              

              Object.values(inninglist).forEach(function (itemInning, indexPerPlayer) {
                 
                  
                  let inKey = Object.keys(inninglist)[indexPerPlayer];
                  let run = 0;
                  let four = 0;
                  let six = 0;
                  let catch1 =0;
                  let runout =0;
                  let stumped =0;

                  let wicket = 0;
                  let mdnover = 0;
                  let fivewhb  = 0;
                  let fourwhb  = 0;
                  let erone=0;
                  let ertwo=0;
                  let erthree=0;
                  let erfour=0;
                  let erfive=0;
                  let ersix=0;

                

                if (itemInning["batting"] && (itemInning["batting"]["runs"] || itemInning["batting"]["runs"]>=0)) {
                      let itemResult=itemInning["batting"];

                      run  =  parseFloat((itemResult["runs"]) ? (parseFloat(itemResult["runs"]) * parseFloat(fantasypoints.run)) : 0);
                      four =  parseFloat((itemResult["fours"]) ? (parseFloat(itemResult["fours"]) * parseFloat(fantasypoints.four)) : 0);
                      six  =  parseFloat((itemResult["sixes"]) ? (parseFloat(itemResult["sixes"]) * parseFloat(fantasypoints.six)) : 0);
                        trun=trun+run;
                        tfour=tfour+four;
                        tsix=tsix+six;
                        totalpoints = totalpoints + (run + four + six);
                      let myrun = parseFloat(itemResult["runs"]);
                      

                      totalrun = totalrun + myrun;
                        if ( myrun >= 50 && myrun<100 ){
                            totalpoints = totalpoints + parseFloat(fantasypoints.fifty);
                            fiftyBonus  = fiftyBonus + parseFloat(fantasypoints.fifty);
                        }
                        if (myrun >= 100) {
                            totalpoints = totalpoints + parseFloat(fantasypoints.hundred);
                            hundredBonus  = hundredBonus + parseFloat(fantasypoints.hundred);
                        }
                     

                     if(matchType != 'Test'){
                        let ptype = 2;  // Player Type Batsman
                        let plrType = matchPlayers.find(plr => (plr.pid === playerid));
                       if( plrType != undefined && plrType['playertype'] == ptype && parseFloat(itemResult["balls"]) >= parseFloat(fantasypoints.srmball) )
                       {
                          if(parseFloat(itemResult["strike_rate"]) >= 60 &&  parseFloat(itemResult["strike_rate"]) <= 70 ){
                              totalpoints = totalpoints + parseFloat(fantasypoints.srone);
                              srone=srone+parseFloat(fantasypoints.srone);
                          }

                         else if(parseFloat(itemResult["strike_rate"]) >= 50 &&  parseFloat(itemResult["strike_rate"]) <= 59.9 ){
                              totalpoints = totalpoints + parseFloat(fantasypoints.srtwo);
                              srtwo=srtwo+parseFloat(fantasypoints.srtwo);
                          }
                          else if(parseFloat(itemResult["strike_rate"]) < 50 ){
                              totalpoints = totalpoints + parseFloat(fantasypoints.srthree);
                              srthree=srthree+parseFloat(fantasypoints.srthree);
                          }                    
                      }
                     }   

                   
                     
                      if (itemResult["dismissed"]===true) {
                          if (myrun == 0) {
                              totalpoints = totalpoints + parseFloat(fantasypoints.duck);
                              duck  = duck + parseFloat(fantasypoints.duck);
                          }
                      } 
                      
                      ///////////Check for Thrower//////////
                      let throwerValuePlyId=(itemResult.ball_of_dismissed && itemResult.ball_of_dismissed.wicket_type==="runout" && itemResult.ball_of_dismissed.other_fielder)?(itemResult.ball_of_dismissed.other_fielder):"";
                      if(throwerValuePlyId)
                      {
                        arrayThrowerPlyId.push(throwerValuePlyId);
                      }
                      //////////////////////////////////////
                       ///////////Check for Catcher//////////
                       let catcherValuePlyId=(itemResult.ball_of_dismissed && itemResult.ball_of_dismissed.fielder.key)?(itemResult.ball_of_dismissed.fielder.key):"";
                       if(catcherValuePlyId)
                       {
                         arrayCatcherPlyId.push(catcherValuePlyId);
                       }
                       //////////////////////////////////////
                  } 

                  

                  if (itemInning["bowling"] && itemInning["bowling"]["runs"]) {
                          let itemResult=itemInning["bowling"];
                          wicket =  parseFloat((itemResult["wickets"]) ? parseFloat(itemResult["wickets"]) * parseFloat(fantasypoints.wicket) : 0);
                          mdnover =  parseFloat((itemResult["maiden_overs"]) ? parseFloat(itemResult["maiden_overs"]) * parseFloat(fantasypoints.mdnover) : 0);
                          totalpoints =totalpoints +  parseFloat(wicket + mdnover)
                          
                        if(parseFloat(itemResult["wickets"]) == 4){
                            totalpoints =totalpoints +  parseFloat(fantasypoints.fourwhb);
                            fourwhb   =  parseFloat(fantasypoints.fourwhb);
                          }
                          if(parseFloat(itemResult["wickets"]) >= 5){
                            totalpoints =totalpoints +  parseFloat(fantasypoints.fivewhb);
                            fivewhb     =    parseFloat(fantasypoints.fivewhb);
                          }

                          if(matchType != 'Test' && parseFloat(itemResult["overs"]) >= parseFloat(fantasypoints.ermover) ){
                            if(parseFloat(itemResult["economy"]) < 4 ){
                                totalpoints =totalpoints +  parseFloat(fantasypoints.erone);
                                erone     =    parseFloat(fantasypoints.erone);
                            }
                            else if(parseFloat(itemResult["economy"]) >= 4 &&  parseFloat(itemResult["economy"]) <= 4.99 ){
                                totalpoints =totalpoints +  parseFloat(fantasypoints.ertwo);
                                ertwo     =    parseFloat(fantasypoints.ertwo);
                            }
                            else  if(parseFloat(itemResult["economy"]) >= 5 &&  parseFloat(itemResult["economy"]) <= 6 ){
                                totalpoints =totalpoints +  parseFloat(fantasypoints.erthree);
                                erthree     =    parseFloat(fantasypoints.erthree);
                            }
                            else  if(parseFloat(itemResult["economy"]) >= 9 &&  parseFloat(itemResult["economy"]) <= 10 ){
                                totalpoints =totalpoints +  parseFloat(fantasypoints.erfour);
                                erfour     =    parseFloat(fantasypoints.erfour);
                            }                    
                            else if(parseFloat(itemResult["economy"]) >= 10.1 &&  parseFloat(itemResult["economy"]) <= 11 ){
                                totalpoints =totalpoints +  parseFloat(fantasypoints.erfive);
                                erfive     =    parseFloat(fantasypoints.erfive);
                            }
                            else if(parseFloat(itemResult["economy"]) > 11 ){
    
                                totalpoints =totalpoints +  parseFloat(fantasypoints.ersix);
                                ersix     =    parseFloat(fantasypoints.ersix);
                            }
                        }


                      } 
                      twicket = twicket+wicket;
                      tmdnover = tmdnover+mdnover;
                      tfourwhb   = tfourwhb+fourwhb;
                      tfivewhb     =  tfivewhb+fivewhb;
                      terone     =  terone+erone;
                      tertwo     =  tertwo+ertwo;
                      terthree     =  terthree+erthree;
                      terfour     =  terfour+erfour;
                      terfive     =  terfive+erfive;
                      tersix     =  tersix+ersix;

                      if (itemInning["fielding"]) {
                            let itemResult=itemInning["fielding"];
                              catch1 = parseFloat((itemResult["catches"]) ? parseFloat(itemResult["catches"]) * parseFloat(fantasypoints.catch) : 0);
                              //runout =  parseFloat((itemResult["runouts"]) ? parseFloat(itemResult["runouts"]) * parseFloat(fantasypoints.runout) : 0);
                              stumped =  parseFloat((itemResult["stumbeds"]) ? parseFloat(itemResult["stumbeds"]) * parseFloat(fantasypoints.stumped) : 0);
                              totalpoints = totalpoints + parseFloat(catch1+runout+stumped);                              
                          } 

                          tcatch1 =tcatch1+catch1;
                          trunout =trunout+runout;
                          tstumped =tstumped+stumped;

                })
               
                 //(Object.keys(arrayAllTeamIds))[indexResult];
                //pointList[playerid] = totalpoints;



                let obj1 = {};
                obj1["totalpoints"] = totalpoints,
                obj1["matchId"] = matchid;
                obj1["pid"] = playerid;
                obj1["run"] = trun;
                obj1["four"] = tfour;
                obj1["six"] = tsix;
                obj1["wicket"] = wicket;
                obj1["mdnover"] = mdnover;
                obj1["catch"] = tcatch1;
                obj1["stumped"] = tstumped;
                obj1["playername"] = name;
                obj1["fiftyBonus"] = fiftyBonus;
                obj1["hundredBonus"] = hundredBonus;
                obj1["fourwhb"] = fourwhb;
                obj1["fivewhb"] = fivewhb;
                obj1["duck"] = duck;
                obj1["playeingPoints"] = playeingPoints;

                obj1["srone"]=srone;
                obj1["srtwo"]=srtwo;
                obj1["srthree"]=srthree;
                obj1["erone"]=erone;
                obj1["ertwo"]=ertwo;
                obj1["erthree"]=erthree;
                obj1["erfour"]=erfour;
                obj1["erfive"]=erfive;
                obj1["ersix"]=ersix;
                obj1["thrower"]=0;
                obj1["catcher"]=0;
                obj1["runout"] =0; //trunout;
              

                globalArr[playerid] = obj1;


                pointList[playerid] = totalpoints;
                let updatedata = await pointsRecord(totalpoints, playerid, matchid, connection)
                if (updatedata) {
                   // console.log("there are the total point ", updatedata)
                }
            } catch (e) {
                console.log("there are the error", e)
            }
        })//Loop End

        arrayThrowerPlyId.forEach(itemThrowerPlyId=>{

            let playerDetail=globalArr[itemThrowerPlyId];
            let throwerpnt=(playerDetail["thrower"])? parseFloat(playerDetail["thrower"]) :0;

            throwerpnt=throwerpnt+parseFloat(fantasypoints.thrower);
            playerDetail["thrower"]=throwerpnt;
            playerDetail["totalpoints"] =playerDetail["totalpoints"]+throwerpnt;
            globalArr[itemThrowerPlyId]=playerDetail;

            let updatedata = await pointsRecord(playerDetail["totalpoints"], itemThrowerPlyId, matchid, connection)

        })

        arrayCatcherPlyId.forEach(itemCatcherPlyId=>{

            let playerDetail=globalArr[itemCatcherPlyId];
            let catcherpnt=(playerDetail["catcher"])? parseFloat(playerDetail["catcher"]) :0;

            catcherpnt=catcherpnt+parseFloat(fantasypoints.catcher);
            playerDetail["catcher"]=catcherpnt;
            playerDetail["totalpoints"] =playerDetail["totalpoints"]+catcherpnt;
            globalArr[itemCatcherPlyId]=playerDetail;
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


// cron.schedule('*/1 * * * *', () => {
//  saveNewmatches();
// });