"use strict";
require('dotenv').config()
const axios = require("axios");
const ApibaseUrl = require('./db');
const fs = require("fs");
const cron = require('node-cron');
const mysql_pool = require('./db');
const MatchProcess = require('./models/processmatches');
const NotifyMail = require('./models/NotifyMail');


let upateContest = (matchid,data,matchdetail,connection)=>{
return new Promise((resolve,reject)=>{

  let getuserdfeequery = 'SELECT id,userid,fees FROM joincontests where matchid ="' + matchid + '" AND poolcontestid ='+data.contestmetaid;
  connection.query(getuserdfeequery,async function(error, userdata, fields) {
   if (error) {
          console.log("there are the error", error);
      } else if (userdata.length>0) {
        for(let i = 0;i<userdata.length;i++){                                                                                            
            ///////////
            let mailTempDetail={
                "matchid":matchdetail.matchid,
                "mdategmt":matchdetail.mdategmt,
                "seriesname":matchdetail.seriesname,
                "team1":matchdetail.team1,
                "team2":matchdetail.team2,
                "matchname":matchdetail.matchname,
                "team1logo":matchdetail.team1logo,
                "team2logo":matchdetail.team2logo,
                "refundamt":userdata[i].fees,
                "isprivate":data.isprivate                
            };
                        
            let mailTemp={};
            
            mailTemp["userid"]=userdata[i].userid;
           
            
        let mmt=await mongoMailTemplete(mailTempDetail,mailTemp,connection);
         //////////////
        let cancelpool = 'CALL refundFeesCancelPool('+ userdata[i].userid + ',' + userdata[i].id + ',' +userdata[i].fees+')';
        connection.query(cancelpool, true, (error, results, fields) => {
            if (error) {
            console.log("there are the error--",error);
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
})
}


let cancelContest  = (matchid,matchdetail,connection)=>{
return  new Promise((resolve,reject)=>{

  let getJoinQuery = 'SELECT mcp.contestmetaid,cm.maxteams,cm.joinfee,cm.isprivate FROM matchcontestpool mcp INNER JOIN contestsmeta cm ON mcp.contestmetaid=cm.id where mcp.matchid="' +matchid+'" AND cm.c='+0;

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
                  } else if (results1){

                      let getPersentage = parseFloat((100) * (results1[0].count)) / results[i].maxteams;                      
                      if((results[i].isprivate==1 && getPersentage  < 100) || (results[i].isprivate==0 && getPersentage  < 80)){                    

                     upateContest(matchid,results[i],matchdetail,connection).then((resu)=>{
                      // if(resu===false)
                       //{
                       let updateStatus = 'update matchcontestpool set iscancel ='+1+' where  contestmetaid ='+results[i].contestmetaid+' AND matchid ="'+matchid+'"';
                      connection.query(updateStatus, function(error, results, fields) {
                           if (error) {
                           console.log("there are the error--",error);
                         }else{
                             
                           resolve(results)
                           // resolve(results[i])
                         }
                       })
                     //}
                       console.log("delete successfully---");

                     }).catch(e =>{
                       console.log("error ==",e);
                     })
                   }else {
                       resolve(false);
                   }

                  }
              })

           }
        }
        else {
          resolve(false);
        }
    })
  })
}



let mongoMailTemplete=async(mailTempDetail,mailTemp,connection)=>{
    try{
      console.log("mailTempDetail--->>>",mailTempDetail);
      
        if(mailTemp.userid)
        {
            let getUserDetail="select email,phone,teamname,name,devicetype,devicetoken from users urs inner join userprofile up on urs.id=up.userid where urs.id="+mailTemp.userid;
          let udetail= await connection.query(getUserDetail,async function(errorUserDetail, resultUserDetail) {

            let getMatchDetail="SELECT seriesname,matchname,team1,team2,team1logo,team2logo from matches where matchid='"+mailTempDetail.matchid+"'";
            let mdetail= await connection.query(getMatchDetail, function(errorMatchDetail, resultMatchDetail) {
                let email="";
                let teamname="";
                let name="";
                let phone="";
                let devicetype="";
                let devicetoken="";

                let seriesname="";
                let matchname="";
                let team1="";
                let team2="";
                let team1logo="";
                let team2logo="";
                let refundamt="";
                let mdate="";

                if(resultUserDetail && resultUserDetail.length>0)
                {
                    email=resultUserDetail[0].email;
                    teamname=resultUserDetail[0].teamname;
                    name=resultUserDetail[0].name;
                    phone=resultUserDetail[0].phone;
                    devicetype=resultUserDetail[0].devicetype;
                    devicetoken=resultUserDetail[0].devicetoken;
                }

                if(resultMatchDetail && resultMatchDetail.length>0)
                {
                    seriesname=resultMatchDetail[0].seriesname;
                    matchname=resultMatchDetail[0].matchname;
                    team1=resultMatchDetail[0].team1;
                    team2=resultMatchDetail[0].team2;
                    team1logo=resultMatchDetail[0].team1logo;
                    team2logo=resultMatchDetail[0].team2logo;
                    mdate=resultMatchDetail[0].mdate;
                }
                let msgPer=(mailTempDetail.isprivate==1)?"100":"80";
                let message="Pool cancelled due to less than "+msgPer+"% team joined";
                let mailDetail={};
                mailDetail["name"]=(name)?name:teamname;
                mailDetail["email"]=email;
                mailDetail["subject"]=PRODUCTNAME+" pool cancelled";
                mailDetail["webname"]=PRODUCTNAME;
                mailDetail["template"]="matchcancel.php";
                mailDetail["content"]=message;
                mailDetail["matchs"] = {
                    "refundamt" : mailTempDetail.refundamt,
                    "team_a" : team1,
                    "team_b" : team2,
                    "team1logo":team1logo,
                    "team2logo":team2logo,
                    "matchname":matchname,
                    "series" : seriesname,
                    "mdate" : mdate                   
                }
               

                mailTemp["maildata"]=mailDetail;
                mailTemp["email"]=email;
                mailTemp["phone"]=phone;
                mailTemp["content"]=message;
                if(devicetype!="web")
                {
                    mailTemp["notify"]={
                        "token" : [devicetoken],
                        "devicetype" : devicetype,
                        "message" : message,
                        "title" : "Pool cancelled",
                        "ntype" : "clpool",
                        "notify_id" : 1
                    };
                }
               
                
             


                mailTemp["type"]= "clpool";
                mailTemp["devicetype"]= devicetype;
                let currentdate=new Date();
                var datum = Date.parse(currentdate.toString());
     
                mailTemp["created"]= datum/1000;
              

                NotifyMail.create(mailTemp,function(eeee,rrr){
                    if(eeee)
                    {
                        console.log("eeee--->>",eeee);
                    }
                });

            })
               
            })
        }
       
       
    }catch(e){
        console.log("e=>",e.toString());
        
    }

}



var livematches = async (req, res) => {
  console.log("-----livematches-------");
    (mysql_pool.mysql_pool).getConnection(async function(err, connection) {
        try {
            if (err) {
                console.log(' Error getting mysql_pool connection: ' + err);
            } else {
                let selectquery = 'select matchid,mdategmt,gameid,seriesid,seriesname,team1,team2,matchname,team1logo,team2logo from  matches where  mstatus = "uc" and matchid not like "dm-%"';
                connection.query(selectquery, async function(error, results, fields) {
                    if (error) {
                        console.log("connection down at", error);
                    } else if (results) {
                        results.forEach((item)=>{
                            var matchid = item.matchid;
                            let mdategmt = parseInt(item.mdategmt);
                            let date = new Date / 1000 | 0;
                            let reqmdate=new Date(mdategmt*1000);
                            if (mdategmt <= date) {
                                
                               let sdomesticstatus=(matchid.indexOf("dm")>-1)?1:0;
                                
                               MatchProcess.find({"matchid":matchid},function(eeeefind,rrrfind){
                                  
                                   if(rrrfind.length==0)
                                   {
                                        MatchProcess.create({"matchid":matchid,"mstatus":"","mdate":reqmdate,"team1":item.team1,"team2":item.team2,"plyrfntyptstatus":0,"mongosavestatus":0,"filesavestatus":0,"pointstatus":0,"pointteamstatus":0,"ppointstatus":0,"seriesid":item.seriesid,"gameid":item.gameid,"domesticstatus":sdomesticstatus},function(eeee,rrr){
                                                if(eeee)
                                                {
                                                    console.log("eeee--->>",eeee);
                                                }
                                            });
                                    }
                                })
                                
                              cancelContest(matchid,item,connection).then((data)=>{
                                let updatequery = 'update matches  SET  mstatus = "li" where matchid = "' + matchid + '" AND mstatus = "uc"';
                                connection.query(updatequery, function(error, results11, fields) {
                                    if (error) {
                                        console.log(new Date())
                                        console.log("connection down at", error);
                                    } else if (results11) {
                                        console.log("match live successfully====>>", results11);
                                    } else {
                                        console.log("match still not started");
                                    }
                                })
                              }).catch(e=>{
                                console.log(error,e);
                              })

                            }
                        })
                    } else {
                        console.log("not match id is  active");
                    }
                })
            }
            connection.release();
            console.log("connection relese successfully");
        } catch (e) {
            console.log("error=====>", e);
        }
    })
}


cron.schedule('*/1 * * * *', () => {
     livematches();
});
livematches();