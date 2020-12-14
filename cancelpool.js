const express = require('express');
var cors = require('cors')
require('dotenv').config()
var app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors())
const connection = require('./dbtx');



let upateContest =async (matchid,data,userdata)=>{
      
        //console.log("userdata.length--->>",userdata.length);
           if (userdata && userdata.length>0) {
            //console.log("there are the user -----",userdata);
           // for(let i = 0;i<userdata.length;i++){
            userdata.forEach(async itemUserdata=>{
            //let cancelpool = 'CALL refundFeesCancelPool('+ itemUserdata.userid + ',' + itemUserdata.id + ',' +itemUserdata.fees+')';
            let userwallet="SELECT walletbalance FROM users WHERE id="+itemUserdata.userid;
            //console.log("cancelpoolresults----->",cancelpool);
            const [resultsUserWallet,fieldResultsresultsUserWallet]=await connection.query(userwallet);
            let userfees=0;
            if(resultsUserWallet && resultsUserWallet.length>0)
            {
                userfees=resultsUserWallet[0].walletbalance+itemUserdata.fees;
                let updatewall="UPDATE users SET walletbalance='"+userfees+"' WHERE id="+itemUserdata.userid
                const [resultsUpdateWall,fieldResultsresultsUpdateWall]=await connection.execute(updatewall);

                let insertwall="INSERT INTO transactions SET userid='"+itemUserdata.userid+"',amount='"+itemUserdata.fees+"',txdate=UNIX_TIMESTAMP(),docid='"+itemUserdata.id+"',ttype='cr',atype='ntflpool',wlt='wltbal',prebal='"+resultsUserWallet[0].walletbalance+"',curbal='"+userfees+"'"
                const [resultsInsertWall,fieldResultsresultsInsertWall]=await connection.execute(insertwall);

                connection.release();
            }
        //})
        })
      //FOR}
    
      }
      else {
        return false;
      }
    //Q})
   
    }


let cancelContest  =async (matchid)=>{
   // return  new Promise((resolve,reject)=>{
    
      let getJoinQuery = 'SELECT mcp.contestmetaid,cm.maxteams FROM matchcontestpool mcp INNER JOIN contestsmeta cm ON mcp.contestmetaid=cm.id where mcp.matchid="' +matchid+'" and mcp.iscancel=0';
    
      console.log("getJoinQuery--->>",getJoinQuery);
      const [results,fieldresults]=await connection.execute(getJoinQuery);
      console.log("results ==",results);     
    
      if(results && results.length > 0){
            
            // result are the array of contest id
              //for(let i = 0;i<results.length;i++){
                results.forEach(async itemResults => {
                    
                
              // results.forEach(function(poolidrate){
                  var query2 = 'SELECT id,userid,fees FROM joincontests where matchid ="' + matchid + '" AND poolcontestid = ' + itemResults.contestmetaid;
                  console.log("query2------>>>",query2);
                const [results1,fieldResults1]=await  connection.execute(query2);
                console.log("results2--->>>",results1)

                      if (results1){
                          try{
                        let resrs=await upateContest(matchid,itemResults,results1);
                           let updateStatus = 'update matchcontestpool set iscancel=? where  contestmetaid =? AND matchid =?';
                          
                         const [resultsupdateStatus,itemResults1]=await connection.execute(updateStatus,[1,itemResults.contestmetaid,matchid]);
                               if(resultsupdateStatus){
                                return (resultsupdateStatus)
                               // resolve(results[i])
                             }
                            
                           //Q})
                         //}
                           console.log("delete successfully---");
    
                        
                            }
                            catch(e) {
                                console.log("error===>",e);
                            }
    
                      }
                      else
                      {
                          console.log("error--->>",results1);
                          
                      }
                  //Q})
                });
               //FOR}
            }
            else
            {
                //return false;
            }
        //})
     // })
    }

app.get('/poolcancilbyadmin', async (req, res) => {
    let {
        matchid,
        poolid
    } = req.query;
    if (matchid) {

      let matchStatusQuery = "select * from matches where matchid=? and mstatus=?";
      console.log("matchStatusQuery=",matchStatusQuery);
     const [results,fieldR]=await connection.execute(matchStatusQuery,[matchid,'li']);
     console.log("results 1--->>",results);
     if (results && results.length > 0) {
            
            console.log("results 3--->>",results);  

      let data=await cancelContest(matchid);
      console.log("data-->>",data)
      
      if(data==false)
      {
        return res.json({msg : "error",status : 200,error : true,err :""})    
      }
      else
      {
      
        console.log("working");
        let updatequery = 'update matches  SET  mstatus = "cl" where matchid = "' + matchid + '" AND mstatus = "li"';
        
       const [results11,fieldresults11]=await connection.execute(updatequery);
            if (results11) {
                console.log("match cancel successfully====>>", results11);
              return res.json({msg : "match cancel successfully",status : 200,error : false})
            } else {
                console.log("match still not started");
            }
       // })
    }
    
    //   }).catch(e=>{
    //     console.log(error,e);
    //     return res.json({msg : "error",status : 200,error : true,err :e})

    //   })
    
  }
  else
  {
    return res.status(400).json({msg : "this match still not  live",status : 400,error : true})
  }

//})
    } else {
        return res.json({
            msg: "matchid and poolid is required",
            error: true
        })

    }
})




app.listen('9990', () => {
    console.log("port is listen on the port----9990");
})  