"use strict";
require('dotenv').config()
const connConfig = require('./dbtx');
const cron = require('node-cron');



async function copypool() {
    try {
        //console.log('kkkkkkkkkkkk');
        const conn = await connConfig.getConnection();

        let matchListQuery="SELECT matchid,mdategmt FROM matches where mstatus='uc'";
        let upcommingMatchList=await conn.query(matchListQuery);
        upcommingMatchList=JSON.parse(JSON.stringify(upcommingMatchList[0]));
        
        console.log("upcommingMatchList  ",upcommingMatchList);
      

        let getPoolString=`SELECT cm.contestid,cm.joinfee,cm.totalwining,cm.winners,cm.c,cm.m,cm.s,cm.maxteams,mcp.matchid,mcp.contestmetaid,(cm.maxteams-count(jc.poolcontestid)) as joinleft
				FROM matchcontestpool mcp
				INNER JOIN contestsmeta cm ON mcp.contestmetaid=cm.id
				LEFT JOIN joincontests jc ON jc.poolcontestid=mcp.contestmetaid AND jc.matchid=? 
				WHERE mcp.matchid=? AND mcp.iscpfull=0 GROUP BY mcp.contestmetaid having (cm.maxteams-count(jc.poolcontestid))=0`;

        await conn.beginTransaction();
        try {
            //for (let index = 0; index < upcommingMatchList.length; index++) {
                upcommingMatchList.forEach(async itemUpcomMatch=>{
                let element =itemUpcomMatch; //upcommingMatchList[index];
               
                    let poolList=await conn.query(getPoolString,[element.matchid,element.matchid]);

                    //console.log(element.matchid,"poolList---->>>",poolList)
                    poolList=JSON.parse(JSON.stringify(poolList[0]));
                    
                    let currenttimemill = new Date / 1000 | 0;
                    let matchtimemill=parseInt(element.mdategmt);
                    let difftimenow=(matchtimemill-currenttimemill)/60;
                    //console.log(element,"--->>matchid=",element.matchid," matchtimemill=",matchtimemill," currenttimemill=",currenttimemill," difftimenow=",difftimenow);
                    
                   
                        if (poolList && poolList.length>0) {
                            
                            //for (let j = 0; j < poolList.length; j++) {
                                poolList.forEach(async itemPool=>{
                                    let queryCpyStatus="SELECT * FROM cpypoolproc where matchid='"+element.matchid+"' and contestid='"+itemPool.contestid+"' and status=1";
                                    let cpyStatus=await conn.query(queryCpyStatus);
                                    cpyStatus=JSON.parse(JSON.stringify(cpyStatus[0]));
                                    //console.log("cpyStatus=====>>>",difftimenow,cpyStatus);
                                    
                                    if(cpyStatus && cpyStatus.length>0 && difftimenow>cpyStatus[0].cpybfrtim)
                                    {
                                const poolelement =itemPool; //poolList[j]; 
                                //console.log("poolelement  ",poolelement);

                                // if (poolelement.joinleft === 0) {

                                    let getMatchContestQuery="SELECT id FROM matchcontest WHERE matchid=? AND contestid=? AND status=1";
                                    let matchcontestList=await conn.query(getMatchContestQuery,[element.matchid,poolelement.contestid]);
                                    matchcontestList=JSON.parse(JSON.stringify(matchcontestList[0][0]));
                                    let getPoolprizebreaksQuery="SELECT id,pmin,pmax,pamount FROM poolprizebreaks WHERE poolcontestid=?"
                                    let getPoolprizebreaksList=await conn.query(getPoolprizebreaksQuery,[poolelement.contestmetaid]);
                                    getPoolprizebreaksList=JSON.parse(JSON.stringify(getPoolprizebreaksList[0]))
                                    //console.log("getPoolprizebreaksList  ",getPoolprizebreaksList);
                                                                
                                    let arrayOfElement=[];
                                    arrayOfElement.push([poolelement.contestid,poolelement.joinfee,poolelement.totalwining,poolelement.winners,poolelement.maxteams,poolelement.c,poolelement.m,poolelement.s,poolelement.contestmetaid]);
                                    let instertPoolQuery='INSERT INTO contestsmeta (contestid,joinfee,totalwining,winners,maxteams,c,m,s,cp) values ?'
                                    let insertQueryPool=await conn.query(instertPoolQuery,[arrayOfElement]);
                                    console.log("insertQueryPool--->>",insertQueryPool);
                                    //console.log("****************************************8 =>> ",insertQueryPool[0].insertId);
                                    let lastId = insertQueryPool[0].insertId;    
                                    getPoolprizebreaksList.forEach(async elPoolPrize => {
                                        //console.log("elemetynssss",elPoolPrize.id)  ; 

                                        let arrayOfElement=[];
                                        arrayOfElement.push([lastId,elPoolPrize.pmin,elPoolPrize.pmax,elPoolPrize.pamount]);
                                        let instertPoolPrizeQuery='INSERT INTO poolprizebreaks (poolcontestid,pmin,pmax,pamount) values ?'
                                        let insertQueryPoolPrize=await conn.query(instertPoolPrizeQuery,[arrayOfElement]); 

                                    });
                                
                                    let arrayOfElement3=[];
                                    arrayOfElement3.push([matchcontestList.id,lastId,poolelement.contestid,element.matchid]);
                                    let instertMatchContestQuery='INSERT INTO matchcontestpool (matchcontestid,contestmetaid,contestid,matchid) VALUES ?'
                                    let instertMatchContest=await conn.query(instertMatchContestQuery,[arrayOfElement3]); 
                                    console.log("instertMatchContest--->>",instertMatchContest);
                                    //Update pool    

                                    let updateContestMetaQuery = 'UPDATE matchcontestpool SET iscpfull=1 WHERE contestmetaid=? AND matchid=?'
                                    let updateMatchContest=await conn.query(updateContestMetaQuery,[poolelement.contestmetaid,element.matchid]); 
                                    console.log("updateMatchContest--->>",updateMatchContest);
                                // }else{

                                //     console.log("Contest not full yet ->>>",poolelement.contestmetaid);
                                // }

                                ////FOR
                                }
                            })
                        
                     }
                    })
            await conn.commit();
            conn.release();
        } catch (error) {
            console.log("errorerrorerror ",error);
            
            await conn.rollback();conn.release();
        }
                
    } catch (error) {
        console.log("error   ",error);
    }
};


cron.schedule('*/1 * * * *', () => {
    copypool();
})

