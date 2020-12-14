"use strict";
require("dotenv").config();
const axios = require("axios");
const cron = require("node-cron");
const PlayerPoints = require("./models/playerpoints");
const MatchProcess = require("./models/processmatches");
const connConfig = require("./dbtx");
const connConfig1 = require("./db");

let getMatchPlayers = async () => {
  const connection = await connConfig.getConnection();

  try {
    await connection.beginTransaction();
    //console.log("-----getMatchPlayers------11")
    MatchProcess.find(
      { ppointstatus: 0 },
      async function (
        errorMatchProcess,
        resultMatchProcess,
        fieldMatchProcess
      ) {
        // console.log("-----getMatchPlayers------",resultMatchProcess)

        if (resultMatchProcess && resultMatchProcess.length > 0) {
          resultMatchProcess.forEach(async function (itemMatchProcess) {
            let smatchid = itemMatchProcess.matchid;
            if (itemMatchProcess.mongosavestatus === 1) {
              MatchProcess.updateOne(
                { matchid: smatchid },
                { $set: { ppointstatus: 1 } },
                function (eeee, rrr) {}
              );
            }

            //let scoreUrl = (ApibaseUrl.ApibaseUrl.scoreurl) + '/getPlayerpoints?matchid=1144483';

            let scoreUrl = "";
            console.log("scoreUrl------------>>>>", scoreUrl);
            if (itemMatchProcess.gameid == 1) {
              scoreUrl =
                connConfig1.ApibaseUrl.scoreurl +
                "/getPlayerpoints?matchid=" +
                smatchid;
            } else if (itemMatchProcess.gameid == 3) {
              scoreUrl =
                connConfig1.ApibaseUrl.scoreurl +
                "/getPlayerpoints/kabaddi?matchid=" +
                smatchid;
            } else if (itemMatchProcess.gameid == 2) {
              scoreUrl =
                connConfig1.ApibaseUrl.scoreurl +
                "/getPlayerpoints/football?matchid=" +
                smatchid;
            }
            var scoreresultarr = await axios.get(scoreUrl);
            let fantasypoints = scoreresultarr.data;

            if (fantasypoints && !fantasypoints.error) {
              let playerlist = fantasypoints.data;

              //console.log("---------CHECKED----------", fantasypoints);
              // return false;
              Object.values(playerlist).forEach(async function (
                itemPlayerList,
                index
              ) {
                // console.log(itemPlayerList);
                //return false;
                //console.log("fantasypoints---->>>>",fantasypoints);

                itemPlayerList.seriesid = itemMatchProcess.seriesid;
                itemPlayerList.gameid = itemMatchProcess.gameid;
                itemPlayerList.matchtype = fantasypoints.matchtype;

                //SELECT * FROM userteamplayers utp inner join joincontests jc on utp.userteamid=jc.uteamid where pid='28081' and matchid='1144510' group by matchid,uteamid,poolcontestid;

                let selectedPlayerQuery =
                  "SELECT * FROM joincontests where matchid='" +
                  smatchid +
                  "' and uteamid in (select userteamid from userteamplayers where pid='" +
                  itemPlayerList.pid +
                  "') group by uteamid";
                //"SELECT * FROM userteamplayers utp inner join joincontests jc on utp.userteamid=jc.uteamid where pid='"+itemPlayerList.pid+"' and matchid='"+smatchid+"' group by matchid,uteamid,poolcontestid";
                //-----------------------------------
                let totalPlayerQuery =
                  "SELECT * FROM joincontests where matchid='" +
                  smatchid +
                  "' group by uteamid";
                //"SELECT uteamid FROM joincontests where matchid='"+smatchid+"' group by uteamid";

                let [selectedplayer, f1] = await connection.query(
                  selectedPlayerQuery
                );
                let [totalplayer, f2] = await connection.query(
                  totalPlayerQuery
                );

                //console.log("=======AAAAA======>>>>",selectedplayer.length,"-----",totalplayer.length);

                itemPlayerList.selectedplayer = selectedplayer.length;
                itemPlayerList.totalplayer = totalplayer.length;
                itemPlayerList.selectplyrper =
                  selectedplayer.length > 0 && totalplayer.length > 0
                    ? (
                        (selectedplayer.length * 100) /
                        totalplayer.length
                      ).toFixed(2)
                    : 0;

                itemPlayerList.team1 = itemMatchProcess.team1;
                itemPlayerList.team2 = itemMatchProcess.team2;

                //console.log({ "pid": itemPlayerList,"matchId":smatchid,"seriesid":itemPlayerList.seriesid,"gameid":itemPlayerList.gameid });

                PlayerPoints.updateOne(
                  {
                    pid: itemPlayerList.pid,
                    matchId: smatchid,
                    seriesid: itemPlayerList.seriesid,
                    gameid: itemPlayerList.gameid,
                  },
                  itemPlayerList,
                  { upsert: true },
                  function (errr, ress) {
                    if (errr) {
                      //console.log("===>>>", errr);
                    }

                    //console.log("ttt------>>>",Object.keys(playerlist).length +"==="+ (index))
                    // if(Object.keys(playerlist).length=== (index+1))
                    // {
                    //     MatchProcess.updateOne({"matchid":smatchid},{"$set":{"ppointstatus":1}},function(eeee,rrr){
                    //     });
                    // }
                  }
                );
              });
            }
          });
        } else {
        }
      }
    );
    await connection.commit();
    connection.release();
  } catch (e) {
    console.log("something went wrong ---->>", e);
    await connection.rollback();
    connection.release();
  }
};

cron.schedule("*/1 * * * *", () => {
  getMatchPlayers();
});
