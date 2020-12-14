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
const NotifyMail = require("./models/NotifyMail");

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

console.log("mysql_pool.PRODUCTNAME---->>>", PRODUCTNAME);

let getTeamMyPoolId = (poolId, matchId, connection) => {
  return new Promise((resolve, reject) => {
    //let query = 'SELECT jc.uteamid,jc.poolcontestid,jc.userid,jc.ptotal,FIND_IN_SET ( jc.ptotal, ( SELECT GROUP_CONCAT( jc.ptotal ORDER BY jc.ptotal DESC ) FROM joincontests jc WHERE jc.matchid="' + matchId + '" AND jc.poolcontestid=' + poolId + ') ) AS rank1 FROM joincontests jc WHERE jc.matchid="' + matchId + '" AND jc.poolcontestid=' + poolId + ' ORDER BY jc.ptotal DESC'
    let query =
      "SELECT jc.userid,jc.uteamid,ut.teamname,jc.poolcontestid,jc.winbal,jc.ptotal, @rank := (CASE WHEN @rankval = jc.ptotal THEN @rank WHEN (@rankval := jc.ptotal) IS NOT NULL THEN @rank + 1 WHEN (@rankval := jc.ptotal) IS NOT NULL THEN 1 END) AS rank1 FROM joincontests jc INNER JOIN userteams ut ON jc.uteamid=ut.id, (SELECT @rank := 0, @partval := NULL, @rankval := NULL) AS x WHERE jc.matchid='" +
      matchId +
      "' AND jc.poolcontestid='" +
      poolId +
      "' ORDER BY jc.ptotal desc";
    connection.query(query, function (error, results, fields) {
      if (error) {
        console.log("connection down at", error);
        resolve(false);
      } else if (results.length > 0) {
        resolve(results);
      } else {
        resolve(results);
      }
    });
  });
};

let getPoolprizebreaks = (poolId, connection) => {
  return new Promise((resolve, reject) => {
    let query =
      "SELECT * FROM poolprizebreaks where  poolcontestid  =" + poolId;

    connection.query(query, function (error, results, fields) {
      if (error) {
        console.log("connection down at", error);
        resolve(false);
      } else if (results.length > 0) {
        resolve(results);
      } else {
        resolve(results);
      }
    });
  });
};

let provideRank = (
  teamRankArr,
  poolPriceArr,
  connection,
  matchId,
  teamid,
  completeMatchName,
  completeMatchCreated
) => {
  return new Promise(async (resolve, reject) => {
    try {
      for (let i = 0; i < teamRankArr.length; i++) {
        if (teamRankArr[i].ptotal && parseFloat(teamRankArr[i].ptotal) > 0) {
          let obj = await poolPriceArr.filter(
            (item) =>
              teamRankArr[i].rank1 >= item.pmin &&
              teamRankArr[i].rank1 <= item.pmax
          );

          let givenAmount = obj[0] ? await parseFloat(obj[0].pamount) : 0;
          if (givenAmount != 0) {
            let teaminRank = await teamRankArr.filter(
              (item) => teamRankArr[i].rank1 == item.rank1
            );
            let payableAmount = (await givenAmount) / teaminRank.length;

            let sql =
              "CALL updateWinBalance('" +
              matchId +
              "'," +
              teamRankArr[i].userid +
              "," +
              teamRankArr[i].poolcontestid +
              "," +
              teamRankArr[i].uteamid +
              "," +
              payableAmount +
              ")";
            let winBal = await connection.query(
              sql,
              true,
              async (error, results, fields) => {
                if (error) {
                  console.error("there are the procedure error", error.message);
                  //    resolve(true);
                } else if (results) {
                  let winamount = teamRankArr[i].winbal
                    ? parseFloat(teamRankArr[i].winbal)
                    : 0;
                  if (winamount > 0) {
                    let mailTempDetail = {
                      matchid: matchId,
                      //"userid":teamRankArr[i].userid,
                      poolcontestid: teamRankArr[i].poolcontestid,
                      uteamid: teamRankArr[i].uteamid,
                      payableAmount: payableAmount,
                      breakpoints: poolPriceArr,
                      rank: teamRankArr[i].rank1,
                      totalprize: teamRankArr[i].ptotal,
                      winprize: teamRankArr[i].winbal,
                      matchname: completeMatchName,
                      matchstart: completeMatchCreated,
                    };

                    let mailTemp = {};

                    mailTemp["userid"] = teamRankArr[i].userid;
                    //mailTemp["matchs"]=teamRankArr[i].userid;

                    let mmt = await mongoMailTemplete(
                      mailTempDetail,
                      mailTemp,
                      connection
                    );
                  }
                }
                //resolve(results);
              }
            );
          }
        }
      }
      resolve(true);
    } catch (e) {
      console.error("there are the procedure error", e);
    }
  });
};

let mongoMailTemplete = async (mailTempDetail, mailTemp, connection) => {
  try {
    if (mailTemp.userid) {
      let getUserDetail =
        "select email,phone,teamname,name,devicetype,devicetoken from users urs inner join userprofile up on urs.id=up.userid where urs.id=" +
        mailTemp.userid;
      let udetail = await connection.query(
        getUserDetail,
        async function (errorUserDetail, resultUserDetail) {
          let getMatchDetail =
            "SELECT m.seriesname,m.matchname,m.team1,m.team2,m.team1logo,m.team2logo,cm.winners,cm.joinfee,cm.totalwining,jc.winbal,ut.teamname,m.mdate FROM contestsmeta cm inner join joincontests jc on cm.id=jc.poolcontestid inner join matches m on jc.matchid=m.matchid inner join userteams ut on jc.uteamid=ut.id where jc.matchid='" +
            mailTempDetail.matchid +
            "' and jc.uteamid='" +
            mailTempDetail.uteamid +
            "' and jc.poolcontestid='" +
            mailTempDetail.poolcontestid +
            "'";
          let mdetail = await connection.query(
            getMatchDetail,
            function (errorMatchDetail, resultMatchDetail) {
              let email = "";
              let teamname = "";
              let name = "";
              let phone = "";
              let devicetype = "";
              let devicetoken = "";

              let seriesname = "";
              let matchname = "";
              let team1 = "";
              let team2 = "";
              let team1logo = "";
              let team2logo = "";
              let winners = "";
              let joinfee = "";
              let totalwining = "";
              let winbal = "";
              let winteamname = "";
              let mdate = "";

              if (resultUserDetail && resultUserDetail.length > 0) {
                email = resultUserDetail[0].email;
                teamname = resultUserDetail[0].teamname;
                name = resultUserDetail[0].name;
                phone = resultUserDetail[0].phone;
                devicetype = resultUserDetail[0].devicetype;
                devicetoken = resultUserDetail[0].devicetoken;
              }

              if (resultMatchDetail && resultMatchDetail.length > 0) {
                seriesname = resultMatchDetail[0].seriesname;
                matchname = resultMatchDetail[0].matchname;
                team1 = resultMatchDetail[0].team1;
                team2 = resultMatchDetail[0].team2;
                team1logo = resultMatchDetail[0].team1logo;
                team2logo = resultMatchDetail[0].team2logo;
                winners = resultMatchDetail[0].winners;
                joinfee = resultMatchDetail[0].joinfee;
                totalwining = resultMatchDetail[0].totalwining;
                winbal = resultMatchDetail[0].winbal;
                winteamname = resultMatchDetail[0].teamname;
                mdate = resultMatchDetail[0].mdate;
              }

              let mailDetail = {};
              mailDetail["name"] = name ? name : teamname;
              mailDetail["email"] = email;
              mailDetail["subject"] = PRODUCTNAME + " Win Contest";
              mailDetail["webname"] = PRODUCTNAME;
              mailDetail["template"] = "wincontest.php";
              mailDetail["matchs"] = {
                twin: totalwining,
                winamt: mailTempDetail.winprize,
                team_a: team1,
                team_b: team2,
                series: seriesname,
                mdate: mdate,
                efees: joinfee,
                nofwin: winners,
                winteam: winteamname,
                urank: mailTempDetail.rank,
              };

              mailTemp["maildata"] = mailDetail;
              mailTemp["email"] = email;
              mailTemp["phone"] = phone;
              mailTemp["content"] = "";
              if (devicetype != "web") {
                mailTemp["notify"] = {
                  token: [devicetoken],
                  devicetype: devicetype,
                  message: "Congratulation",
                  title: "Win Contest",
                  ntype: "wincnst",
                  notify_id: 1,
                };
              }

              mailTemp["type"] = "wincnst";
              mailTemp["devicetype"] = devicetype;
              let currentdate = new Date();
              var datum = Date.parse(currentdate.toString());

              mailTemp["created"] = datum / 1000;

              NotifyMail.create(mailTemp, function (eeee, rrr) {
                if (eeee) {
                  console.log("eeee--->>", eeee);
                }
              });
            }
          );
        }
      );
    }
  } catch (e) {
    console.log("e=>", e.toString());
  }
};

let updateUserbalance = async (req, res) => {
  try {
    mysql_pool.mysql_pool.getConnection(async function (err, connection) {
      try {
        if (err) {
          console.log(" Error getting mysql_pool connection: " + err);
        } else {
          let getCompleteMatch =
            'select matchid,matchname,mdate from matches where mstatus ="cm"';
          connection.query(
            getCompleteMatch,
            function (errorMatches, resultMatches, fields) {
              if (errorMatches) {
                console.log("connection down at", errorMatches);
              } else if (resultMatches.length > 0) {
                for (let k = 0; k < resultMatches.length; k++) {
                  let completeMatchId = resultMatches[k].matchid;
                  let completeMatchName = resultMatches[k].matchname;
                  let completeMatchCreated = resultMatches[k].mdate;
                  let teamData = [];

                  MatchProcess.find(
                    {
                      matchid: completeMatchId,
                      plyrfntyptstatus: 1,
                      pointteamstatus: 1,
                    },
                    function (errormatchidarr, matchidarr, fieldsmatchidarr) {
                      if (matchidarr && matchidarr.length > 0) {
                        // let query = 'SELECT poolcontestid FROM joincontests where matchid=' + completeMatchId + ' group by poolcontestid;'
                        let query =
                          'SELECT contestmetaid as poolcontestid FROM matchcontestpool where matchid="' +
                          completeMatchId +
                          '" AND iscancel =' +
                          0;
                        connection.query(
                          query,
                          async function (error, results, fields) {
                            try {
                              if (error) {
                                console.log("connection down at", error);
                              } else if (results.length > 0) {
                                let n = 1;
                                for (let i = 0; i < results.length; i++) {
                                  var spoolId = results[i].poolcontestid;
                                  console.log(
                                    "spoolId---------------------",
                                    spoolId
                                  );

                                  let result = await getTeamMyPoolId(
                                    spoolId,
                                    completeMatchId,
                                    connection
                                  );
                                  //console.log("result----->>>",result)

                                  if (result.length > 0) {
                                    let result1 = await getPoolprizebreaks(
                                      spoolId,
                                      connection
                                    );

                                    //console.log("RANK----->>>",(result && result.length>0)?result[0].ptotal:0)

                                    if (result1.length > 0) {
                                      let response = await provideRank(
                                        result,
                                        result1,
                                        connection,
                                        completeMatchId,
                                        completeMatchName,
                                        completeMatchCreated
                                      );

                                      if (response) {
                                        if (results.length == n) {
                                          let status = "dc";
                                          let updateQuery =
                                            'update matches set mstatus = "' +
                                            status +
                                            '" where matchid = "' +
                                            completeMatchId +
                                            '"';
                                          connection.query(
                                            updateQuery,
                                            function (error, results, fields) {
                                              if (error) {
                                                console.log(
                                                  "error ===>",
                                                  error
                                                );
                                              } else if (results) {
                                                //console.log("userbalance update successfully")
                                              }
                                            }
                                          );
                                        }
                                        n++;
                                      }
                                    }
                                  } else {
                                    let status = "dc";
                                    let updateQuery =
                                      'update matches set mstatus = "' +
                                      status +
                                      '" where matchid = "' +
                                      completeMatchId +
                                      '"';
                                    connection.query(
                                      updateQuery,
                                      function (error, results, fields) {
                                        if (error) {
                                          console.log("error ===>", error);
                                        } else if (results) {
                                          console.log(
                                            "there are not getting any poolcontestid form this id",
                                            completeMatchId
                                          );
                                        }
                                      }
                                    );
                                  }
                                }
                              } else {
                                let status = "dc";
                                let updateQuery =
                                  'update matches set mstatus = "' +
                                  status +
                                  '" where matchid = "' +
                                  completeMatchId +
                                  '"';
                                connection.query(
                                  updateQuery,
                                  function (error, results, fields) {
                                    if (error) {
                                      console.log("error ===>", error);
                                    } else if (results) {
                                      console.log(
                                        "thats successfully saved---------------",
                                        results
                                      );
                                      console.log(
                                        "there are not getting any poolcontestid form this id",
                                        completeMatchId
                                      );
                                    }
                                  }
                                );
                              }
                            } catch (e) {
                              console.log("there are the error ---", e);
                            }
                          }
                        );
                      }
                    }
                  );
                }
              } else {
                console.log("completeMatchId is not there");
              }
            }
          );
          connection.release();
          console.log("connection relese successfully");
        }
      } catch (e) {
        console.log("there are the error---", e);
      }
    });
  } catch (e) {
    console.log("there are the error ", e);
  }
};

// cron.schedule('*/5 * * * *', () => {
//    updateUserbalance();
// })
