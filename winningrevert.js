"use strict";
const express = require("express");
var app = express();
const axios = require("axios");
require("dotenv").config();
const mysql_pool = require("./db");
const ApibaseUrl = require("./db");
const cron = require("node-cron");
const bodyParser = require("body-parser");
const MatchProcess = require("./models/processmatches");

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

let winningRevert = () => {
  return new Promise((resolve, reject) => {
    let matchId = "gblt20_2019_can_g8";
    mysql_pool.mysql_pool.getConnection(async function (err, connection) {
      //let query = 'SELECT jc.uteamid,jc.poolcontestid,jc.userid,jc.ptotal,FIND_IN_SET ( jc.ptotal, ( SELECT GROUP_CONCAT( jc.ptotal ORDER BY jc.ptotal DESC ) FROM joincontests jc WHERE jc.matchid="' + matchId + '" AND jc.poolcontestid=' + poolId + ') ) AS rank1 FROM joincontests jc WHERE jc.matchid="' + matchId + '" AND jc.poolcontestid=' + poolId + ' ORDER BY jc.ptotal DESC'
      let query =
        "SELECT * from joincontests where matchid='" +
        matchId +
        "' and winbal>0";
      connection.query(query, function (error, results, fields) {
        if (error) {
          //console.log(new Date())
          console.log("connection down at", error);
          resolve(false);
        } else if (results.length > 0) {
          results.forEach((itemResult, index) => {
            //console.log("itemResult-->>",itemResult);         
            //return;
            let smatchid = matchId;
            let poolcontestid = itemResult.poolcontestid;
            let uteamid = itemResult.uteamid;
            let winbal = itemResult.winbal;
            let fees = itemResult.fees;
            let userid = itemResult.userid;
            let sql =
              "CALL cancelWinning('" +
              smatchid +
              "','" +
              userid +
              "','" +
              poolcontestid +
              "','" +
              uteamid +
              "','" +
              winbal +
              "')";
            connection.query(sql, true, (errorCW, resultsCW, fieldsCW) => {
              if (errorCW) {
                console.log(errorCW);
              }
              console.log(
                "index-->>",
                index,
                userid,
                uteamid,
                poolcontestid,
                winbal
              );
            });
          });
          console.log("there are the result============11111", results);
          resolve(results);
        } else {
          console.log("there are the result============222222");
          resolve(results);
        }
      });
    });
  });
};

//winningRevert();
