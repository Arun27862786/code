"use strict";
require('dotenv').config();
const axios = require("axios");
const mysql_pool = require('./db');
const ApibaseUrl = require('./db');
const fs = require("fs");
const cron = require('node-cron');
const mongoose = require('mongoose');
const CompleteMatch = require('./completematch.js');
const connection = mysql_pool.mysql_pool;
const MatchProcess = require('./models/processmatches');


var changeMatchStatus = function (matchid) {
  return new Promise((resolve, reject) => {
    let updatequery = 'update matches  SET  mstatus = "cm" where matchid = "' + matchid + '" AND mstatus = "li"';
    connection.query(updatequery, function (error, results, fields) {
      if (error) {
        console.log("error ===>", error);
        resolve(false);
      }
      else {
        //console.log("results ===>", results);
        resolve(true);
        //console.log("match status update successfully>>", results);
      }
    })
  })
}



var saveNewmatches = async (req, res) => {
  MatchProcess.find({ "mongosavestatus": 0 }, async function (error, resultsCP, fields) {
    try {
      if (error) {
        console.log("connection down at", error);
      } else
        if (resultsCP.length > 0) {
          resultsCP.forEach(async itemCP => {
            let matchid = itemCP.matchid;
            console.log("matchid===============>>>>",matchid);
            let api_url=0;
            if(itemCP.gameid==1)
            {
              api_url = NEWCRICKETAPI + "/matches/match/" + matchid;
            }else if(itemCP.gameid==2){
              api_url = NEWCRICKETAPI + "/football/match/" + matchid;
            }
            else if(itemCP.gameid==3){
              api_url = NEWCRICKETAPI + "/kabaddi/match/" + matchid;
            }
            
            var response = await axios.get(api_url);            
            if (response.data) {
              let mtype = "";
              let matchdetail = response.data.match;
              let sShortDetail=(itemCP.gameid==2)?(response.data.match.match):(response.data.match);
              let sstatus = sShortDetail.status;
              let status_overview =sShortDetail.status_overview;
              let matchstarted =(itemCP.gameid==2)?(sShortDetail.start.gmt): sShortDetail.start_date.iso;
              let inningswise = (response.data.match.innings)?response.data.match.innings:{};

              let teama = {};
              let teamb = {};
              let inningsdetail={};

              

              if(itemCP.gameid==1)
              {
                mtype = response.data.format;
                if (inningswise) {
                  Object.values(inningswise).forEach(itemIW => {
                    let teamACheck = itemIW.key.indexOf("a");
                    if (teamACheck > -1) {
                      let inningname = itemIW.key.split("_");
                      teama[inningname[1]] = itemIW.run_str;
                    }
  
                    let teamBCheck = itemIW.key.indexOf("b");
                    if (teamBCheck > -1) {
                      let inningname = itemIW.key.split("_");
                      teamb[inningname[1]] = itemIW.run_str;
                    }
                  });
                }
                 inningsdetail = {
                  "a": teama,
                  "b": teamb
                }
              }else if(itemCP.gameid==3){
                
                mtype = "kabaddi";
                inningsdetail = {
                  "a": (response.data.match.score)?response.data.match.score.a:"",
                  "b": (response.data.match.score)?response.data.match.score.b:""
                }
              }else if(itemCP.gameid==2){
                mtype = "football";
                inningsdetail = {
                  "a": (response.data.match.score)?response.data.match.score.home:"",
                  "b": (response.data.match.score)?response.data.match.score.away:""
                }
              }
             
              //let dataReviewCheck = (response.data.data_review_checkpoint)?response.data.data_review_checkpoint:'';

              if(itemCP.gameid==2)
              {
                if ( response.data.status == "completed" && (response.data.status_overview == "result" || response.data.status_overview == "draw")) {
                  changeMatchStatus(matchid);
                  let updateDate = await MatchProcess.updateOne({ matchid: matchid }, { "$set": { mongosavestatus: 1 } });
                }
              }
              else if(itemCP.gameid==1)
              {
                if (response.data.match.status == "completed" && (response.data.match.status_overview == "result" || response.data.match.status_overview == "draw")) {
                  changeMatchStatus(matchid);
                  let updateDate = await MatchProcess.updateOne({ matchid: matchid }, { "$set": { mongosavestatus: 1} });
                }
                 /* if (response.data.match.data_review_checkpoint!="post-match-validated" && response.data.match.status == "completed" && (response.data.match.status_overview == "result" || response.data.match.status_overview == "draw")) {
                    //changeMatchStatus(matchid);
                    //let updateDate = await MatchProcess.updateOne({ matchid: matchid }, { "$set": { mongosavestatus: 1} });

                    let updateDate = await MatchProcess.updateOne({ matchid: matchid,completestatus:{$ne:1} }, { "$set": { mongosavestatus: 0,completedate:new Date(),completestatus:1 } });
                  }

                  if (response.data.match.data_review_checkpoint=="post-match-validated" && response.data.match.status == "completed" && (response.data.match.status_overview == "result" || response.data.match.status_overview == "draw")) {
                    //changeMatchStatus(matchid);
                    //let updateDate = await MatchProcess.updateOne({ matchid: matchid }, { "$set": { mongosavestatus: 1} });

                    let updateDate = await MatchProcess.updateOne({ matchid: matchid }, { "$set": { mongosavestatus: 1,reviewdate:new Date() } });
                  }
                  */
              }else if(itemCP.gameid==3)
              {
                  if (response.data.match.status == "completed" && (response.data.match.status_overview == "result" || response.data.match.status_overview == "draw")) {
                    changeMatchStatus(matchid);
                    let updateDate = await MatchProcess.updateOne({ matchid: matchid }, { "$set": { mongosavestatus: 1 } });
                  }
              }

              let updateDate = await CompleteMatch.updateOne({ matchid: matchid }, { type: mtype,gameid:itemCP.gameid, match: matchdetail, status: sstatus, status_overview: status_overview, inningsdetail: inningsdetail, matchstarted: matchstarted, plyrfntystatus: 0 }, { upsert: true });

            } else {
              console.log("no data");
            }
          })
        } else {
          console.log("empty");
        }


    } catch (e) {
      console.log("error ===>", e);
    }
  })

}
cron.schedule('*/1 * * * *', () => {
 saveNewmatches();
})
saveNewmatches();