"use strict";
const axios = require("axios");
require("dotenv").config();
const mysql_pool = require("./db");
const cron = require("node-cron");
var dateFormat = require("dateformat");
const gameid = 2;
const mtype = "football";
var saveNewmatches = async (req, res) => {
  try {
    let api_url = NEWCRICKETAPI + "/football/upcommingmatches";
    var response = await axios.get(api_url);

    mysql_pool.mysql_pool.getConnection(function (err, con) {
      if (err) {
        console.log(" Error getting mysql_pool connection: " + err);
      }

      var upcommingmatches =
        response && response.data && response.data.length > 0
          ? response.data
          : "";

      upcommingmatches.forEach((matchItem, matchIndex) => {
        /*console.log('matchItem ->>',matchItem);
                matchItem.match.key;
                matchItem.name; */
        var matchObj = matchItem.match;

        var start_date =
          matchObj.start_date && matchObj.start_date.timestamp
            ? matchObj.start_date.timestamp * 1000
            : "";
        start_date = new Date(start_date).toLocaleString("en-US", {
          timeZone: "Asia/Calcutta",
        });
        start_date = dateFormat(start_date, "yyyy-mm-dd HH:MM:ss.000");
        //console.log("start_date--->>",start_date,new Date(start_date).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne'}));

        var team1 =
          matchObj.mteams.a && matchObj.mteams.a.code
            ? matchObj.mteams.a.code
            : "";
        var team2 =
          matchObj.mteams.b && matchObj.mteams.b.code
            ? matchObj.mteams.b.code
            : "";

        var sqlMatch =
          "SELECT unique_id FROM  matchmaster WHERE gameid=? AND unique_id=?";
        con.query(
          sqlMatch,
          [gameid, matchObj.key],
          function (err, result, fields) {
            //if (err) console.log(err);
            //console.log('result =>> ',result);
            //console.log('result 11=>> ',matchObj);
            if (result.length > 0) {
              var sqlUpdate =
                "UPDATE matchmaster SET mdate='" +
                start_date +
                "',dateTimeGMT='" +
                start_date +
                "',team1='" +
                team1 +
                "',team2='" +
                team2 +
                "',mtype='" +
                mtype +
                "',name='" +
                matchObj.name +
                "',seasonkey='" +
                matchObj.tournament.key +
                "',seriesname='" +
                matchObj.tournament.legal_name +
                "' WHERE gameid='" +
                gameid +
                "' AND unique_id='" +
                matchObj.key +
                "'";
              con.query(sqlUpdate, function (err, result, fields) {
                if (err) {
                  console.log(" Error : " + err);
                }
                console.log("update node", matchIndex);
              });
            } else {
              var sqlInsert =
                "INSERT INTO matchmaster (unique_id,mdate,dateTimeGMT,team1,team2,mtype,gameid,name,seasonkey,seriesname) VALUES(?,?,?,?,?,?,?,?,?,?)";
              con.query(
                sqlInsert,
                [
                  matchObj.key,
                  start_date,
                  start_date,
                  team1,
                  team2,
                  mtype,
                  gameid,
                  matchObj.name,
                  matchObj.tournament.key,
                  matchObj.tournament.legal_name,
                ],
                function (err, result, fields) {
                  if (err) {
                    console.log(" Error : " + err);
                  }
                  console.log("insert node", matchIndex);
                }
              );
            }
          }
        );
      });
    });
  } catch (e) {
    console.log("error catch", e);
  }
};

cron.schedule("0 0 */3 * * *", () => {
  saveNewmatches();
});
saveNewmatches();
