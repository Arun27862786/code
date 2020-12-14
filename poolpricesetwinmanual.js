"use strict";
const express = require("express");
var app = express();
const axios = require("axios");
require('dotenv').config()
const mysql_pool = require('./db');
const ApibaseUrl = require('./db');
const cron = require('node-cron');
const bodyParser = require('body-parser');
const MatchProcess = require('./models/processmatches');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));


let getTeamMyPoolId = (poolId, matchId, connection) => {
    return new Promise((resolve, reject) => {
        //let query = 'SELECT jc.uteamid,jc.poolcontestid,jc.userid,jc.ptotal,FIND_IN_SET ( jc.ptotal, ( SELECT GROUP_CONCAT( jc.ptotal ORDER BY jc.ptotal DESC ) FROM joincontests jc WHERE jc.matchid="' + matchId + '" AND jc.poolcontestid=' + poolId + ') ) AS rank1 FROM joincontests jc WHERE jc.matchid="' + matchId + '" AND jc.poolcontestid=' + poolId + ' ORDER BY jc.ptotal DESC'
        let query = "SELECT jc.userid,jc.uteamid,ut.teamname,jc.poolcontestid,jc.winbal,jc.ptotal, @rank := (CASE WHEN @rankval = jc.ptotal THEN @rank WHEN (@rankval := jc.ptotal) IS NOT NULL THEN @rank + 1 WHEN (@rankval := jc.ptotal) IS NOT NULL THEN 1 END) AS rank1 FROM joincontests jc INNER JOIN userteams ut ON jc.uteamid=ut.id, (SELECT @rank := 0, @partval := NULL, @rankval := NULL) AS x WHERE jc.matchid='" + matchId + "' AND jc.poolcontestid='" + poolId + "' ORDER BY jc.ptotal desc"
        connection.query(query, function (error, results, fields) {
            if (error) {
                console.log(new Date())
                console.log("connection down at", error);
                resolve(false);
            } else if (results.length > 0) {
                console.log("there are the result============11111", results);
                resolve(results);
            } else {
                console.log("there are the result============222222");
                resolve(results);
            }
        })
    })
}

let getPoolprizebreaks = (poolId, connection) => {
    return new Promise((resolve, reject) => {
        let query = 'SELECT * FROM poolprizebreaks where  poolcontestid  =' + poolId;

        connection.query(query, function (error, results, fields) {
            if (error) {
                console.log("connection down at", error);
                resolve(false);

            } else if (results.length > 0) {
                resolve(results);
            } else {
                resolve(results);
            }
        })
    })
}



let provideRank = (teamRankArr, poolPriceArr, connection, matchId, teamid) => {
    return new Promise(async (resolve, reject) => {
        try {

            for (let i = 0; i < teamRankArr.length; i++) {
                if (teamRankArr[i].ptotal && parseFloat(teamRankArr[i].ptotal) > 0) {
                    let obj = await poolPriceArr.filter(item => (((teamRankArr[i].rank1) >= (item.pmin)) && ((teamRankArr[i].rank1) <= (item.pmax))));

                    let givenAmount = (obj[0]) ? await parseFloat(obj[0].pamount) : 0;
                    if (givenAmount != 0) {
                        let teaminRank = await teamRankArr.filter(item => (teamRankArr[i].rank1) == item.rank1)
                        let payableAmount = await givenAmount / (teaminRank.length)
                        console.log("callpro=>>>>>>");
                        console.log(matchId + ',' + teamRankArr[i].userid + ',' + teamRankArr[i].poolcontestid + ',' + teamRankArr[i].uteamid + ',' + payableAmount );
                        
                        let sql = "CALL updateWinBalance('" + matchId + "'," + teamRankArr[i].userid + "," + teamRankArr[i].poolcontestid + "," + teamRankArr[i].uteamid + "," + payableAmount + ")";
                        console.log("sqlsqlsql", sql);
                         connection.query(sql, true, (error, results, fields) => {
                             if (error) {
                                 console.error("there are the procedure error", error.message);
                                 //resolve(false);
                             }
                             console.log("procedure work successfully", results);
                             //resolve(results);
                         });
                    }
                }
            }
            resolve(true);
        } catch (e) {
            console.error("there are the procedure error", e);

        }
    })
}

let updateUserbalance = async (req, res) => {
    try {
        (mysql_pool.mysql_pool).getConnection(async function (err, connection) {
            try {
                if (err) {
                    console.log(' Error getting mysql_pool connection: ' + err);
                } else {

                        var spoolId = 46;
                        var completeMatchId = 'oman_pentagulart20_2019_g5';

                        let result = await getTeamMyPoolId(spoolId, completeMatchId, connection)

                        if (result.length > 0) {

                            let result1 = await getPoolprizebreaks(spoolId, connection);
                            
                            if (result1.length > 0) {

                                let response = await provideRank(result, result1, connection, completeMatchId);
                

                            }
                        } 
                    
                }
            } catch (e) {
                console.log("there are the error ", e);
            }


            })
    } catch (e) {
        console.log("there are the error ", e);
    }
}

//cron.schedule('*/5 * * * *', () => {
  updateUserbalance();
//})
