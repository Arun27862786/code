"use strict";
require('dotenv').config()
const axios = require("axios");
const ApibaseUrl = require('./db');
const ImageUrl    = require('./db');
const CompleteMatch = require('./completematch.js');
const MatchScore = require('./matchscore.js');
const fs = require("fs");
const cron = require('node-cron');
const mysql_pool = require('./db');
const express = require('express');
var cors = require('cors')
var app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors())
const mongoose = require('mongoose');
const connection = mysql_pool.mysql_pool;

// mongoose.connect('mongodb://localhost/brfantasy', { useNewUrlParser: true })

var imageLogo  = ImageUrl.imageUrl;

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


let upateContest = (matchid,data,connection)=>{
return new Promise((resolve,reject)=>{
try{
    
  let getuserdfeequery = 'SELECT id,userid,fees FROM joincontests where matchid ="' + matchid + '" AND poolcontestid ='+data.contestmetaid;
    connection.query(getuserdfeequery, function(error, userdata, fields) {
    
      if (error) {
          console.log("there are the error", error);
          resolve(false);
      } else if (userdata.length>0) {
        for(let i = 0;i<userdata.length;i++){
        let cancelpool = 'CALL refundFeesCancelPool('+ userdata[i].userid + ',' + userdata[i].id + ',' +userdata[i].fees+')';
        
        connection.query(cancelpool, true, (error, results, fields) => {
            if (error) {
            console.log("there are the error--",error);
            resolve(false);
          }else{
        
         resolve(results)
      }
    })
  }

  }
  else {
    resolve(false);
  }
})
}
catch(e){
    console.log("eee--->>",e);
}
})


}


let cancelContest  = (matchid,connection)=>{
return  new Promise((resolve,reject)=>{

  let getJoinQuery = 'SELECT mcp.contestmetaid,cm.maxteams FROM matchcontestpool mcp INNER JOIN contestsmeta cm ON mcp.contestmetaid=cm.id where mcp.matchid="' +matchid+'" and mcp.iscancel=0';

  connection.query(getJoinQuery, function(error, results, fields) {
      if (error) {
          console.log("error to get", error);
          resolve(false);
      }else if(results.length > 0){
        // result are the array of contest id
          for(let i = 0;i<results.length;i++){
          // results.forEach(function(poolidrate){
              var query2 = 'SELECT COUNT(*) AS count FROM joincontests where matchid ="' + matchid + '" AND poolcontestid = ' + results[i].contestmetaid;
              connection.query(query2, function(error, results1, fields) {
                  if (error) {
                      console.log("there are the error", error);
                      resolve(false);
                  } else if (results1){
                     upateContest(matchid,results[i],connection).then((resu)=>{
                       let updateStatus = 'update matchcontestpool set iscancel ='+1+' where  contestmetaid ='+results[i].contestmetaid+' AND matchid ="'+matchid+'"';
                      
                       connection.query(updateStatus, function(error, results, fields) {
                           if (error) {
                           console.log("there are the error--",error);
                           resolve(false);
                         }else{
                           resolve(results)
                           // resolve(results[i])
                         }
                       })
                     //}
                       console.log("delete successfully---");

                     }).catch(e =>{
                       console.log("error ==",e);
                       resolve(false);
                     })


                  }
                  else
                  {
                    resolve(false);
                  }
              })

           }
        }
        else
        {
            resolve(false);
        }
    })
  })
}



app.get('/poolcancilbyadmin', async (req, res) => {
    let {
        matchid,
        poolid
    } = req.query;
    if (matchid) {

      let matchStatusQuery = 'select mstatus from matches where matchid = "' + matchid +'"';
      connection.query(matchStatusQuery, function (error, results, fields) {
          if (error) {
              console.log(new Date())
              console.log("connection down at", error);
              resolve(false);
          } else if (results.length > 0) {
            
              if (results[0].mstatus == 'li') {

      cancelContest(matchid,connection).then((data)=>{
        console.log("working");
        let updatequery = 'update matches  SET  mstatus = "cl" where matchid = "' + matchid + '" AND mstatus = "li"';
        
        connection.query(updatequery, function(error, results11, fields) {
            if (error) {
                console.log(new Date())
                console.log("connection down at", error);
            } else if (results11) {
                console.log("match cancel successfully====>>", results11);
              return res.json({msg : "match cancel successfully",status : 200,error : false})


            } else {
                console.log("match still not started");
            }
        })
      }).catch(e=>{
        console.log(error,e);
        return res.json({msg : "error",status : 200,error : true,err :e})

      })
    }else {
      return res.status(400).json({msg : "this match still not  live",status : 400,error : true})
    }
  }
})
    } else {
        return res.json({
            msg: "matchid and poolid is required",
            error: true
        })

    }
})


let getTotalscore  = (data1)=>{
  return new Promise(async function (resolve, reject) {
  try {
    console.log("there are the working",JSON.stringify(data1));
    let data   =  data1;
    let GlobalArr  = []
    if(data) {
          let bettingArrya    =  data.match.batting;
          let bowlingArr   =     data.match.bowling;
          let fieldingArr   =    data.match.fielding;

          for(let i =0;i<bettingArrya.length;i++){
            let myObj  = {}
            let inningName  = bettingArrya[i].title;
             myObj["inningName"] =  inningName
            let inningRun   = 0;
            let inningWicket   = 0;
            let score   = bettingArrya[i].scores;
            for(let j =0;j<score.length;j++){
              inningRun  = parseFloat(inningRun) + parseFloat((score[j]["R"])?score[j]["R"]:0)
              if(score[j]["batsman"] == "Extras"){
                let Extras   = (score[j].detail).split(" ");
                inningRun  =   inningRun + parseFloat((Extras[0])?Extras[0]:0)
              }
              if(score[j]["dismissal-by"]){

                inningWicket = inningWicket + parseFloat(1);
              }
            }
            myObj["inningRun"]  = parseFloat(inningRun);
            myObj["inningWicket"]  = parseFloat(inningWicket)
            GlobalArr.push(myObj);
          }
          for(let i =0;i<bowlingArr.length;i++){
            let inningName  = bettingArrya[i].title;
            var inningOver   = 0.0;

            let score   = bowlingArr[i].scores;
            for(let j =0;j<score.length;j++){
                let sss=score[j]["O"];
              inningOver  =  inningOver + parseFloat(sss);
              console.log("sssssss----",inningOver,"---"+inningName+"-->>>",score[j]["O"])
            }

            let totalInningOver=inningOver.toFixed(1);

           

            let splitIO=(totalInningOver).split(".");
            let qilply=parseInt(splitIO[1]);
            let totalOverBefore=parseInt(splitIO[0]);
            let hhh=0;
            let tt=0;
            
            if(qilply>5)
            {
                hhh=qilply-6;
                tt=parseFloat(totalOverBefore) + parseFloat("1."+hhh);
               
            }
            else
            {
                tt=totalInningOver;
            }
            //console.log("totalInningOver=",inningName,"---->>>",totalInningOver,"--qilply-->>",qilply,"---tt-->>>",tt,"--hhh=",hhh);

            //console.log("inningOver-------TTTRRRR---------->>",tt,inningOver.toFixed(1));
              GlobalArr[i]["inningOver"] = parseFloat(tt);
            };
            //console.log("GlobalArrGlobalArrGlobalArr ==",GlobalArr);
          }
  resolve(GlobalArr);

  }catch(e){
   console.log("e ============",e);
  }


})
}

app.get('/match', async (req, res) => {
    try {

        console.log("working");
        let matchid = req.query.matchid
        let teamScore  = [];
        let team1inning=[];
        let team2inning=[];

        if (matchid) {
            console.log("matchid", matchid);
            let result = await CompleteMatch.findOne({
                "matchid": matchid
            });
            if (result) {
               console.log("result  ==============raman",JSON.stringify(result));
              let matchStatus = "";
                if(result.match.winner_team){
                  matchStatus = "Completed"
                }else {
                  matchStatus = "InProcess"
                }

                let team1name=result.match.team[0].name;
                let team2name=result.match.team[1].name;


                console.log("matchStatusmatchStatusmatchStatus =============",matchStatus);
              getTotalscore(result).then((teamScore)=>{
                let getJoinQuery = 'SELECT team1,team2,team1logo,team2logo FROM  matches  where matchid=' + matchid;
                connection.query(getJoinQuery, function (error, results, fields) {
                    if (error) {
                        console.log("connection down a",error)
                      }else if(results){
                        //console.log("results ===  thats are------",results);

                        if(results.length>0)
                        {   
                        let teamdetails  = {}
                        let team1 = {};
                        let team2 = {}

                         team1["team1"] = {
                          teamName  : ((results[0])?(results[0]).team1:""),
                          teamlogo  : imageLogo + ((results[0])?(results[0]).team1logo:"")
                        },
                          team2["team2"] = {
                          teamName  : ((results[0])?(results[0]).team2:""),
                          teamlogo  : imageLogo+ ((results[0])?(results[0]).team2logo:"")
                        }
                        teamdetails = {
                          ...team1,...team2
                        }

                        /////////////

                        teamScore.forEach(function(itemScore){

                          if((itemScore.inningName).indexOf(team1name)>-1)
                          {
                            console.log((itemScore.inningName).indexOf(results[0].team1),"--",results[0].team1,"---","itemScore--->>",itemScore);
                            team1inning.push(itemScore);
                          }

                          if((itemScore.inningName).indexOf(team2name)>-1)
                          {
                            console.log((itemScore.inningName).indexOf(results[0].team2),"--",results[0].team2,"---","itemScore--->>",itemScore);
                            team2inning.push(itemScore);
                          }
                        })
                        ////////////



                    result = result.toObject();
                    teamdetails["team1"]["teamName"]  = team1name;
                    teamdetails["team2"]["teamName"]  = team2name

                        result["teamdetails"]  = teamdetails;
                        result["teamScore"]  = {"team1":team1inning,"team2":team2inning};
                        result["matchstatus"]  = matchStatus;


                        return res.json({
                            msg: "match data get successfully",
                            data:  result,
                            error: false
                        })

                    }
                    else
                    {
                        return res.json({
                            msg: "data not found from that match id",
                            error: true
                        })
                    }

                      }
                    })



              }).catch((e)=>{
                console.log(e);
              })
            } else {
                return res.json({
                    msg: "data not found from that match id",
                    error: true
                })
            }
        } else {
            return res.json({
                msg: "matchid required",
                error: true
            })
        }
    } catch (e) {
        console.log("e ===>", e);
        return res.json({
            msg: "matchid required",
            error: true
        })
    }
})




app.get('/getPlayerpoints', async (req, res) => {
    try {
        var matchid = req.query.matchid;
        
        if (matchid) {

            CompleteMatch.findOne({ "matchid": matchid }, async function (errormatchidarr, resultMP, fieldsmatchidarr) {
                if (resultMP) {
                    let itemCompMatch = resultMP;
                    let matchid = itemCompMatch.matchid;
                    let matchPlayers = await getMatchPlayers(matchid, connection);
                try {                    
                        //console.log("--->>>", contents)
                        //let Contents = JSON.parse(contents);
                        let arrayAllTeamIds = itemCompMatch.match.players;
                        let arrayplaying11a = itemCompMatch.match.teams.a.match.playing_xi;
                        let arrayplaying11b = itemCompMatch.match.teams.b.match.playing_xi;
                        let arrayplaying11all=arrayplaying11a.concat(arrayplaying11b);
                        let matchType = ApibaseUrl.matchType[itemCompMatch.type];
                       
                        //console.log("matchType  === >", matchType);
                        let api_url = (ApibaseUrl.ApibaseUrl.baseUrl) + "/getglobalpoints";
                        var response = await axios.post(api_url, {
                            gametype: 'cricket'
                        });
                        if (response) {
                            let fantasypoints = response.data.data.cricket[matchType];
                            let fPoint = await calculatePointEarnNew(arrayplaying11all,arrayAllTeamIds, fantasypoints, matchid,matchType,matchPlayers);
                            if (fPoint) {
                                let teamname={
                                    "team1":itemCompMatch.match.teams.a.short_name,
                                    "team2":itemCompMatch.match.teams.b.short_name
                                }
                                return res.status(200).json({
                                    msg: "player record get successfully",
                                    data: fPoint,
                                    teamname: teamname,//change
                                    matchtype:itemCompMatch.type,
                                    matchStatus: itemCompMatch.status,
                                    "error": false
                                })
                                // console.log("fPointfPointfPointfPoint",fPoint);
                            }
                            else
                            {
                                res.status(200).json({
                                    msg: "no result",
                                    data: "no result",
                                    "error": true
                                })
                            }
                        }
                        else
                        {
                            res.status(200).json({
                                msg: "no result",
                                data: "no result",
                                "error": true
                            })
                        }
                    
                } catch (e) {
                    res.status(200).json({
                        msg: e.toString(),
                        data: "something went wrong",
                        "error": true
                    })
                }
                }
                else
                {
                    res.status(200).json({
                        msg: "no result",
                        data: "no result",
                        "error": true
                    })
                    
                }
            })
        } else {
            res.status(200).json({
                msg: "matchid required",
                data: "matchid required",
                "error": true
            })
        }
    } catch (e) {
        res.status(200).json({
            msg: e.toString(),
            data: "something went wrong",
            "error": true
        })
    }
})


app.get('/getPlayerpoints/kabaddi', async (req, res) => {
    try {
        var matchid = req.query.matchid;
        
        if (matchid) {

            CompleteMatch.findOne({ "matchid": matchid }, async function (errormatchidarr, resultMP, fieldsmatchidarr) {
                if (resultMP) {
                    let itemCompMatch = resultMP;
                    let matchid = itemCompMatch.matchid;
                    //let matchPlayers = await getMatchPlayers(matchid, connection);
                    let matchPlayers = {};
                try {                        
                        
                        // let arrayAllTeamIds = itemCompMatch.match.players;
                        // let arrayplaying11a = itemCompMatch.match.teams.a.match.starters;
                        // let arrayplaying11b = itemCompMatch.match.teams.b.match.starters;                       
                        // let arrayplaying11all=arrayplaying11a.concat(arrayplaying11b);                        
                        // let matchType = ApibaseUrl.matchType[itemCompMatch.type];

                        let arrayAllTeamIds = itemCompMatch.match.players; //Contents.playerscore;
                        let arrayplaying11a = itemCompMatch.match.teams.a.match.starters;
                        let arrayplaying11b = itemCompMatch.match.teams.b.match.starters;
                        
                        arrayAllTeamIds=(Object.values(arrayAllTeamIds)).filter(x=>(x["match"]) && x["match"]["played"]==true);
                        
                        let arrayplaying7aSubti = itemCompMatch.match.teams.a.match.bench;
                        let arrayplaying7bSubti = itemCompMatch.match.teams.b.match.bench;

                        let arrayplaying7AAllOuts = itemCompMatch.match.teams.a.match.stats.all_outs;
                        let arrayplaying7BAllOuts = itemCompMatch.match.teams.b.match.stats.all_outs;
                        let arrayplaying7AllSubti=arrayplaying7aSubti.concat(arrayplaying7bSubti);
                        let smatchType =ApibaseUrl.matchType[itemCompMatch.type]; //Contents.type;
                       
                        
                        let api_url = (ApibaseUrl.ApibaseUrl.baseUrl) + "/getglobalpoints";
                        var response = await axios.post(api_url, {
                            gametype: 'kabaddi'
                        });
                        if (response) {
                            let fantasypoints = response.data.data.kabaddi[smatchType];
                            //let fPoint = await calculatePointEarnNewKabaddi(arrayplaying11all,arrayAllTeamIds, fantasypoints, matchid,matchType);
                            let fPoint = await calculatePointEarnKabaddi(arrayAllTeamIds, fantasypoints, connection, matchid, smatchType,arrayplaying7AllSubti,arrayplaying7AAllOuts,arrayplaying7BAllOuts,arrayplaying11a,arrayplaying11b);
                            if (fPoint) {
                                let teamname={
                                    "team1":itemCompMatch.match.teams.a.short_name,
                                    "team2":itemCompMatch.match.teams.b.short_name
                                }
                                return res.status(200).json({
                                    msg: "player record get successfully",
                                    data: fPoint,
                                    teamname: teamname,//change
                                    matchtype:itemCompMatch.type,
                                    matchStatus: itemCompMatch.status,
                                    "error": false
                                })
                                // console.log("fPointfPointfPointfPoint",fPoint);
                            }
                            else
                            {
                                res.status(200).json({
                                    msg: "No result",
                                    data: "No result",
                                    "error": true
                                })
                            }
                        }
                        else
                        {
                            res.status(200).json({
                                msg: "No result",
                                data: "No result",
                                "error": true
                            })
                        }
                    
                } catch (e) {
                    res.status(200).json({
                        msg: e.toString(),
                        data: "something went wrong",
                        "error": true
                    })
                }
                }
                else
                {
                    res.status(200).json({
                        msg: "No match",
                        data: "No match",
                        "error": true
                    })
                    
                }
            })
        } else {
            res.status(200).json({
                msg: "matchid is required",
                data: "matchid is required",
                "error": true
            })
        }
    } catch (e) {
        console.log("error", e);
        res.status(200).json({
            msg: e.toString(),
            data: "something went wrong",
            "error": true
        })
    }
})


let calculatePointEarnNew = (arrayplaying11all,arrayAllTeamIds, fantasypoints, matchid,matchType,matchPlayers) => {
    return new Promise(function (resolve, reject) {
        let pointList = {};
        let globalArr = {};
        
        let runoutdataArray = {};
        //let arrayThrowerPlyId=[];
        //let arrayCatcherPlyId=[];
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
              let tfivewhb   =0;
              let terone     =0;
              let tertwo     =0;
              let terthree   =0;
              let terfour    =0;
              let terfive    =0;
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
                      //let runoutdataArray = [];
                      let runoutData = (itemResult.dismissed && itemResult.ball_of_dismissed && itemResult.ball_of_dismissed.wicket_type==="runout")?(itemResult.ball_of_dismissed):"";
                      if(runoutData)
                      {
                        let throwerFielder = (runoutData.other_fielder)?runoutData.other_fielder:'';
                        let catcherFielder = (runoutData.fielder && runoutData.fielder.key)?runoutData.fielder.key:'';
                        if(!throwerFielder && catcherFielder){
                            if(throwerFielder in runoutdataArray){
                                runoutdataArray[catcherFielder].runout = runoutdataArray[catcherFielder].runout + 1;
                                /*runoutdataArray[catcherFielder].thrower = runoutdataArray[catcherFielder].thrower + 1;
                                runoutdataArray[catcherFielder].catcher = runoutdataArray[catcherFielder].catcher + 1;*/
                            }else{
                                runoutdataArray[catcherFielder] = { thrower:0, catcher:0,runout:1 };
                            }
                        }else if(throwerFielder && !catcherFielder){
                            if(throwerFielder in runoutdataArray){
                                runoutdataArray[throwerFielder].runout  = runoutdataArray[throwerFielder].runout + 1;
                                /*runoutdataArray[throwerFielder].thrower = runoutdataArray[throwerFielder].thrower + 1;
                                runoutdataArray[throwerFielder].catcher = runoutdataArray[throwerFielder].catcher + 1;*/
                            }else{
                                runoutdataArray[throwerFielder] = { thrower:0, catcher:0 ,runout:1};
                            }
                        }else if(throwerFielder && catcherFielder){
                            if(throwerFielder in runoutdataArray){
                                runoutdataArray[throwerFielder].thrower = runoutdataArray[throwerFielder].thrower + 1;
                            }else{
                                runoutdataArray[throwerFielder] = { thrower:1, catcher:0,runout:0 };
                            }
                            if(catcherFielder in runoutdataArray){
                                runoutdataArray[catcherFielder].catcher = runoutdataArray[catcherFielder].catcher + 1;
                            }else{
                                runoutdataArray[catcherFielder] = { thrower:0, catcher:1,runout:0 };
                            }
                        }
                       
                      }
                      //////////////////////////////////////
                    //    ///////////Check for Catcher//////////
                    //    let catcherValuePlyId=(itemResult.ball_of_dismissed && itemResult.ball_of_dismissed.fielder && itemResult.ball_of_dismissed.fielder.key)?(itemResult.ball_of_dismissed.fielder.key):"";
                    //    if(catcherValuePlyId)
                    //    {
                    //      arrayCatcherPlyId.push(catcherValuePlyId);
                    //    }
                    //    //////////////////////////////////////
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
                            //trunout =trunout+runout;
                            tstumped =tstumped+stumped;

                })

                 //(Object.keys(arrayAllTeamIds))[indexResult];
                pointList[playerid] = totalpoints;
                let obj1 = {};
                obj1["totalpoints"] = totalpoints,
                obj1["matchId"] = matchid;
                obj1["pid"] = playerid;
                obj1["run"] = trun;
                obj1["four"] = tfour;
                obj1["six"] = tsix;
                obj1["wicket"] = twicket;
                obj1["mdnover"] = tmdnover;
                obj1["catch"] = tcatch1;
                obj1["stumped"] = tstumped;
                obj1["playername"] = name;
                obj1["fiftyBonus"] = fiftyBonus;
                obj1["hundredBonus"] = hundredBonus;
                obj1["fourwhb"] = tfourwhb;
                obj1["fivewhb"] = tfivewhb;
                obj1["duck"] = duck;
                obj1["playeingPoints"] = playeingPoints;

                obj1["srone"]=srone;
                obj1["srtwo"]=srtwo;
                obj1["srthree"]=srthree;
                obj1["erone"]=terone;
                obj1["ertwo"]=tertwo;
                obj1["erthree"]=terthree;
                obj1["erfour"]=terfour;
                obj1["erfive"]=terfive;
                obj1["ersix"]=tersix;
                obj1["thrower"]=0;
                //obj1["runout"] =trunout;
                obj1["runout"] =0;
                obj1["catcher"] =0;

                globalArr[playerid] = obj1;
            } catch (e) {
                console.log("there are the error", e)
            }
        })
    
       Object.keys(runoutdataArray).forEach(itemPlrId=>{ 
            
            let playerDetail = globalArr[itemPlrId];

            let runcoutpnt = runoutdataArray[itemPlrId].runout * parseFloat(fantasypoints.runout);
            let throwerpnt = runoutdataArray[itemPlrId].thrower * parseFloat(fantasypoints.thrower);
            let catcherpnt = runoutdataArray[itemPlrId].catcher * parseFloat(fantasypoints.catcher);

            playerDetail["runout"]  = runcoutpnt;
            playerDetail["thrower"] = throwerpnt;
            playerDetail["catcher"] = catcherpnt;

            playerDetail["totalpoints"] =playerDetail["totalpoints"]+throwerpnt + catcherpnt + runcoutpnt;
            globalArr[itemPlrId]=playerDetail;

        })

        resolve(globalArr);
    })
}



let calculatePointEarnKabaddi = (arrayAllTeamIds, fantasypoints, connection, matchid, matchType,arrayplaying7AllSubti,arrayplaying7AAllOuts,arrayplaying7BAllOuts,arrayplaying11a,arrayplaying11b) => {
    return new Promise(function (resolve, reject) {
//console.log("0000000000000------>>>",arrayAllTeamIds, fantasypoints, matchid, matchType,arrayplaying7AllSubti,arrayplaying7AAllOuts,arrayplaying7BAllOuts,arrayplaying11a,arrayplaying11b);
//return;
        let pointList = {};
        let globalArr = {};
        //Object.values(arrayAllTeamIds).map(async function (itemPerPlayer, indexResult) {
            Object.values(arrayAllTeamIds).map(async function (itemPerPlayer, indexResult) {

            try {
                let playerid=itemPerPlayer.key;
                let isSubstitute=arrayplaying7AllSubti.indexOf(playerid)>-1?true:false;
                
                let totalpoints =(isSubstitute==false)?parseFloat(fantasypoints.playing):parseFloat(fantasypoints.makesubstitute);
                let touch = 0;
                let raidbonus = 0;
                let successtackle = 0;
                let unsuccessraid = 0;
                let supertackle = 0;
                let name = '';
                let greencard = 0;
                let yellowcard = 0;
                let redcard = 0;
                
                
                let is7AAllOuts=(arrayplaying7AAllOuts>0)?true:false;
                let is7BAllOuts=(arrayplaying7BAllOuts>0)?true:false;
                let pushAllOut=0;
                let getAllOut=0;
                let teamType="";

                

                if((arrayplaying11a.indexOf(playerid))>-1)
                {
                    teamType="A";
                }else if((arrayplaying11b.indexOf(playerid))>-1){
                    teamType="B";
                }                
                
                //////////////////////
                let itemMatchData = (itemPerPlayer.match) ? itemPerPlayer.match : {};
                                
                name = itemPerPlayer["name"];
                
                greencard = greencard + parseFloat((itemMatchData.green_card) ? parseFloat(fantasypoints.greencard) : 0);
                yellowcard = yellowcard + parseFloat((itemMatchData.yellow_card) ? parseFloat(fantasypoints.yellowcard) : 0);
                redcard = redcard + parseFloat((itemMatchData.red_card) ? parseFloat(fantasypoints.redcard) : 0);            
                touch = touch + parseFloat((itemMatchData.points.raid_points.touch) ? (parseFloat(itemMatchData.points.raid_points.touch) * parseFloat(fantasypoints.touch)) : 0);
                raidbonus = raidbonus + parseFloat((itemMatchData.points.raid_points.bonus) ? (parseFloat(itemMatchData.points.raid_points.bonus) * parseFloat(fantasypoints.raidbonus)) : 0);
                unsuccessraid = unsuccessraid + parseFloat((itemMatchData.raids.unsuccess) ? (parseFloat(itemMatchData.raids.unsuccess) * parseFloat(fantasypoints.unsuccessraid)) : 0);
                successtackle = successtackle + parseFloat((itemMatchData.tackles.success) ? (parseFloat(itemMatchData.tackles.success) * parseFloat(fantasypoints.successtackle)) : 0);
                supertackle = supertackle + parseFloat((itemMatchData.tackles.super_tackles) ? (parseFloat(itemMatchData.tackles.super_tackles) * parseFloat(fantasypoints.supertackle)) : 0);

                if(isSubstitute==false && (is7AAllOuts==true || is7BAllOuts==true))
                {
                    if(teamType=="A" )
                    {
                        pushAllOut = pushAllOut + parseFloat((arrayplaying7AAllOuts) ? (parseFloat(arrayplaying7AAllOuts) * parseFloat(fantasypoints.pushallout)) : 0);                        
                        getAllOut = getAllOut + parseFloat((arrayplaying7BAllOuts) ? (parseFloat(arrayplaying7BAllOuts) * parseFloat(fantasypoints.getallout)) : 0);
                    }
                    else if(teamType=="B" )
                    {
                        pushAllOut = pushAllOut + parseFloat((arrayplaying7BAllOuts) ? (parseFloat(arrayplaying7BAllOuts) * parseFloat(fantasypoints.pushallout)) : 0);                        
                        getAllOut = getAllOut + parseFloat((arrayplaying7AAllOuts) ? (parseFloat(arrayplaying7AAllOuts) * parseFloat(fantasypoints.getallout)) : 0);
                    }    
                }

                totalpoints = totalpoints + parseFloat(greencard+yellowcard+redcard+touch+raidbonus+unsuccessraid+successtackle+supertackle+pushAllOut+getAllOut);
                
                pointList[playerid] = totalpoints;

                //let updatedata = await pointsRecord(totalpoints, playerid, matchid, connection);

                let playeingPoints = (isSubstitute==false)?parseFloat(fantasypoints.playing):parseFloat(fantasypoints.makesubstitute); //parseFloat(fantasypoints.playing);
                let obj1 = {};
                obj1["totalpoints"] = totalpoints,
                obj1["matchId"] = matchid;
                obj1["pid"] = playerid;               
                obj1["playername"] = name;
                obj1["playeingPoints"] = playeingPoints;

                obj1["greencard"]   = greencard;               
                obj1["yellowcard"]  = yellowcard;
                obj1["redcard"]     = redcard;
                obj1["touch"]       = touch;
                obj1["raidbonus"]     = raidbonus;
                obj1["unsuccessraid"] = unsuccessraid;
                obj1["successtackle"] = successtackle;
                obj1["supertackle"]   = supertackle;
                obj1["pushallout"]   = pushAllOut;
                obj1["getallout"]   = getAllOut;

                globalArr[playerid] = obj1;
              
            } catch (e) {
                console.log("there are the error", e)
            }

        })

        resolve(globalArr);
    })
}


app.get('/getPlayerpoints/football', async (req, res) => {
    try {
        var matchid = req.query.matchid;
        
        if (matchid) {

            CompleteMatch.findOne({ "matchid": matchid }, async function (errormatchidarr, resultMP, fieldsmatchidarr) {
                if (resultMP) {
                    let itemCompMatch = resultMP;
                    let matchid = itemCompMatch.matchid;
                    let matchPlayers = await getMatchPlayers(matchid, connection);
                try {                        
                        
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
                       
                        //console.log("ApibaseUrl.ApibaseUrl.baseUrl-->>",ApibaseUrl.ApibaseUrl.baseUrl);
                        let api_url = (ApibaseUrl.ApibaseUrl.baseUrl) + "/getglobalpoints";
                        var response = await axios.post(api_url, {
                            gametype: 'football'
                        });
                        if (response) {
                            let fantasypoints = response.data.data.football[smatchType];                            
                            let fPoint = await calculatePointEarnFootball(arrayplaying11all,arrayAllTeamIds, fantasypoints, connection, matchid, smatchType, matchPlayers);
                            
                            if (fPoint) {
                                let teamname={
                                    "team1":itemCompMatch.match.teams[teamA].code,
                                    "team2":itemCompMatch.match.teams[teamB].code
                                }
                                return res.status(200).json({
                                    msg: "player record get successfully",
                                    data: fPoint,
                                    teamname: teamname,//change
                                    matchtype:itemCompMatch.type,
                                    matchStatus: itemCompMatch.match.match.status,
                                    "error": false
                                })
                                // console.log("fPointfPointfPointfPoint",fPoint);
                            }
                            else
                            {
                                res.status(200).json({
                                    msg: "No result",
                                    data: "No result",
                                    "error": true
                                })
                            }
                        }
                        else
                        {
                            res.status(200).json({
                                msg: "No result",
                                data: "No result",
                                "error": true
                            })
                        }
                    
                } catch (e) {
                    res.status(200).json({
                        msg: e.toString(),
                        data: "something went wrong",
                        "error": true
                    })
                }
                }
                else
                {
                    res.status(200).json({
                        msg: "No match",
                        data: "No match",
                        "error": true
                    })
                    
                }
            })
        } else {
            res.status(200).json({
                msg: "matchid is required",
                data: "matchid is required",
                "error": true
            })
        }
    } catch (e) {
        console.log("error", e);
        res.status(200).json({
            msg: e.toString(),
            data: "something went wrong",
            "error": true
        })
    }
})


let calculatePointEarnFootball = (arrayplaying11all,arrayAllTeamIds, fantasypoints, connection, matchid, matchType, matchPlayers) => {
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

                    let obj1 = {};
                    obj1["totalpoints"] = totalpoints,
                    obj1["matchId"] = matchid;
                    obj1["pid"] = playerid;               
                    obj1["playername"] = name;
                    obj1["playing"] = playing;    
                    obj1["goal"]   = goal;               
                    obj1["assist"]  = assist;
                    obj1["cleansheet"]     = cleansheet;
                    obj1["penaltysave"]       = penaltysave;
                    obj1["yellowcard"]     = yellowcard;
                    obj1["redcard"] = redcard;
                    obj1["owngoal"] = owngoal;
                    obj1["goalsconceded"]   = goalsconceded;
                    obj1["penaltymissed"]   = penaltymissed;
                    obj1["passes"]=tenpasses;
                    obj1["shotontarget"]=twoshottarget;
                    obj1["goalsaved"]=threegoalsaved;
                    obj1["tackles"]=threesucctackle;
                    obj1["goalsconceded"]=twoconceded;
                    obj1["role"]=playerRole;
                    
    
                    globalArr[playerid] = obj1;
                    
                }
            } catch (e) {
                console.log("there are the error", e);
            }

        })
        
        resolve(globalArr);        
    })
}

app.get('/getmatchesscore/:idtype', async (req, res) =>{
    var idtype=req.params.idtype;
    //"match.matchStarted":true,"match.toss_winner_team":{$ne:""},"matchid" : "1178410","match.winner_team": {$eq:null}//
    var objCondition={};
    if(idtype==="live")
    {
        objCondition["matchStarted"]=true;
        objCondition["toss_winner_team"]={$ne:""};
        objCondition["winner_team"]= {$eq:""};
    }
    else
    {
        objCondition["matchid"]=idtype;
    }

    let resultAll =await MatchScore.find(objCondition,function(error,result){
        if(error)
        {
            return res.send({code:1, "msg": "Something went wrong.", "error": true })
        }
        else
        {
            if(result && result.length>0)
            {
                return res.send({
                    code:0,
                    msg: "Match score record get successfully",
                    data: result,
                    "error": false
                })
            }
            else
            {
                return res.send({code:1, "msg": "No live score.", "error": true })
            }
        }
    });
})

///////Paytm/////////

function toTimestamp(strDate){
 var datum = Date.parse(strDate);
 return datum/1000;
}

app.post('/PaytmResponse',async (req, res) => {
	 var orderid=req.body.ORDERID;
    let objpaydetail={
        ORDERID:req.body.ORDERID,
        TXNAMOUNT:req.body.TXNAMOUNT,
        PAYMENTMODE:req.body.PAYMENTMODE,
        TXNID:req.body.TXNID,
        STATUS:req.body.STATUS,
        GATEWAYNAME:req.body.GATEWAYNAME,
        BANKTXNID:req.body.BANKTXNID,
        BANKNAME:req.body.BANKNAME,
        RESPCODE:req.body.RESPCODE,
        TXNDATE:toTimestamp(req.body.TXNDATE),
    };

     let paytmUrl = (ApibaseUrl.ApibaseUrl.baseUrl) + '/walletcallback';
     var response =await axios.post(paytmUrl,objpaydetail);
    var sOrderid=(orderid)?orderid.split("-"):0;
        sOrderid=(sOrderid!=0)?sOrderid[1]:0;
         res.writeHead(301,
            {Location: locationRedirect+sOrderid+"/"+req.body.TXNID}//Redirect Page
          );		
          res.write("Test Test PaytmResponse");//req.body.toString('utf8')
          res.end("TESTINGTESTING");
});


app.listen('9990', () => {
    console.log("port is listen on the port----9990");
})
