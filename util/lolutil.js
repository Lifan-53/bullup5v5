var request = require('request');
var async = require('async');
var lolcfg = require('../cfg/lolcfg.js');

var apiKey =  "RGAPI-8f64929d-c988-4c1b-b96a-5d0210599b73";

function getItemsStaticData(callback){
    var options = {
        url: 'https://na1.api.riotgames.com/lol/static-data/v3/items?locale=zh_CN',
        headers: {
            "Origin": "https://developer.riotgames.com",
            "Accept-Charset": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Riot-Token": apiKey,
            "Accept-Language": "zh-CN,zh;q=0.8",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36"
        }
    };
    request(options, function(error, response, body){
        bodyObj = JSON.parse(body);
        var dataObj = bodyObj.data;
        callback(dataObj);
    });
}

function getChampionsStaticData(callback){
    var options = {
        url: 'https://na1.api.riotgames.com/lol/static-data/v3/champions?locale=zh_CN&dataById=true',
        headers: {
            "Origin": "https://developer.riotgames.com",
            "Accept-Charset": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Riot-Token": apiKey,
            "Accept-Language": "zh-CN,zh;q=0.8",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36"
        }
    };
    request(options, function(error, response, body){
        bodyObj = JSON.parse(body);
        var dataObj = bodyObj.data;
        callback(dataObj);
    });
}

function getSummonerByName(name, callback){
    var options = {
        url: 'https://na1.api.riotgames.com/lol/summoner/v3/summoners/by-name/'+name,
        headers: {
            "Origin": "https://developer.riotgames.com",
            "Accept-Charset": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Riot-Token": apiKey,
            "Accept-Language": "zh-CN,zh;q=0.8",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36"
        }
    };
    request(options, function(error, response, body){
        bodyObj = JSON.parse(body);
        callback(bodyObj);
    });
}

function getRecentMatchesListByAccountId(accountId, startTimeStr, endTimeStr, callback){
    var startTime = (new Date(startTimeStr)).getTime(); 
    var endTime = (new Date(endTimeStr)).getTime();
    var options = {
        url: 'https://na1.api.riotgames.com/lol/match/v3/matchlists/by-account/' + accountId + '?beginTime=' + startTime + '&endTime=' + endTime,
        headers: {
            "Origin": "https://developer.riotgames.com",
            "Accept-Charset": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Riot-Token": apiKey,
            "Accept-Language": "zh-CN,zh;q=0.8",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36"
        }
    };
    request(options, function(error, response, body){
        bodyObj = JSON.parse(body);
        callback(bodyObj);
    });
}

function getMatchDetailsByGameId(gameId, callback){
    var options = {
        url: 'https://na1.api.riotgames.com/lol/match/v3/matches/' + gameId,
        headers: {
            "Origin": "https://developer.riotgames.com",
            "Accept-Charset": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Riot-Token": apiKey,
            "Accept-Language": "zh-CN,zh;q=0.8",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36"
        }
    };
    request(options, function(error, response, body){
        bodyObj = JSON.parse(body);
        callback(bodyObj);
    });
}

function getBullupMatchDetailsBySummonerName(name,startTime,endTime,callback){
    async.waterfall([
        function(done){
            getSummonerByName(name, function(summoner){
                done(null, summoner);
            });
        },
        function(summoner, done){
            getRecentMatchesListByAccountId(summoner.accountId, startTime, endTime, function(gameList){
                done(null, summoner, gameList);
            });
        },
        function(summoner, gameList, done){
            var matchDetails = {};
            async.eachSeries(gameList.matches, function(match, errCb){
                getMatchDetailsByGameId(match.gameId, function(details){
                    matchDetails[match.gameId] = details;
                    errCb();
                });
            }, function(err) {
                if (err) console.log(err);
                matchDetails.summoner = summoner;
                done(null, matchDetails);
            });
        }
    ],function(err,matchDetails){
        var count = 0;
        var result = {};
        result.matches =[];

        for(var gameId in matchDetails){
            var match = matchDetails[gameId];
            var mainPlayerParticipantId;

            result.matches[count] = {};
            result.matches[count].name = matchDetails.summoner.name;
            result.matches[count].gameMode = match.gameMode;
            result.matches[count].gameType = match.gameType;
            result.matches[count].time = new Date(match.gameCreation);
            result.matches[count].paticipants = [];

            var paticipantCount = 0;
            var paticipantIds = [];
            for(var index in match.participantIdentities){
                paticipantIds[paticipantCount] = match.participantIdentities[index].player.participantId;
                if(result.matches[count].name == match.participantIdentities[index].player.summonerName){
                    mainPlayerParticipantId = match.participantIdentities[index].participantId;
                }
                paticipantCount++;
            }

            paticipantCount = 0;
            for(var participant in match.participants){
                if(participant.participantId == mainPlayerParticipantId){
                    result.matches[count].championId = participant.championId;
                    result.matches[count].championName = lolcfg.getChampionNameById(participant.championId);
                    if(participant.stats.win){
                        result.matches[count].win = '胜利';
                    }else{
                        result.matches[count].win = '失败';
                    }
                    result.matches[count].kda = participant.stats.kills + '/' + participant.stats.deaths + '/' + participant.stats.assists;

                }
                result.matches[count].paticipants[paticipantCount] = {};
                result.matches[count].paticipants[paticipantCount].name = match.participantIdentities[participant.participantId - 1].player.name;
                result.matches[count].paticipants[paticipantCount].kda = participant.stats.kills + '/' + participant.stats.deaths + '/' + participant.stats.assists;
                result.matches[count].paticipants[paticipantCount].kdaScore = (participant.stats.kills + participant.stats.assists) / participant.stats.deaths;
                result.matches[count].paticipants[paticipantCount].damage = participant.stats.totalDamageDealtToChampions;
                result.matches[count].paticipants[paticipantCount].damageTaken = participant.stats.totalDamageTaken;
                result.matches[count].paticipants[paticipantCount].goldEarned = participant.stats.goldEarned;
                result.matches[count].paticipants[paticipantCount].items = {};
                result.matches[count].paticipants[paticipantCount].items['item0'] = participant.stats.item0;
                result.matches[count].paticipants[paticipantCount].items['item1'] = participant.stats.item1;
                result.matches[count].paticipants[paticipantCount].items['item2'] = participant.stats.item2;
                result.matches[count].paticipants[paticipantCount].items['item3'] = participant.stats.item3;
                result.matches[count].paticipants[paticipantCount].items['item4'] = participant.stats.item4;
                result.matches[count].paticipants[paticipantCount].items['item5'] = participant.stats.item5;
                result.matches[count].paticipants[paticipantCount].items['item6'] = participant.stats.item6;
                paticipantCount++;
            }
            count++;
        }
        callback(result);
        /*
    //----------------------------------result-data----------------------------------------/
        {
            "matches" : [
                {
                    "name" : "Who is 55Kai",
                    "championId" : "1",
                    "championName" : "黑暗之女",
                    "gameMode" : "CLASSIC",
                    "gameType" : "MATCHED_GAME",
                    "time" : "2017-05-09 15:34:03",
                    "kda" : "13/0/9",
                    "win" : true,
                    "paticipants" : [
                        {
                            "name" : "Who is 55Kai",
                            "kda" : "13/0/9",
                            "kdaScore" : "13.5",
                            "damage" : "20000",
                            "damageTaken": "15000",
                            "goldEarned" : "12000",
                            "items" : {
                                "item0" : 1,
                                "item1" : 1,
                                "item2" : 1,
                                "item3" : 1,
                                "item4" : 1,
                                "item5" : 1,
                                "item6" : 1
                            }
                        }
                        ...
                    ]

                }
                ...
            ]
        }
    */
    });
}

//--------------------------------------test--------------------------------------------/


// getSummonerByName("JMGuo", function(info){
//     console.log("JMGuo's info : " + JSON.stringify(info));
// });

// getChampionsStaticData(function(obj){
//     var count = 0;
//     for(var index in obj){
//         count++;
//         console.log("id:" + obj[index].id + " name:" + obj[index].name);
//     }
//     console.log(count);
// });

// getItemsStaticData(function(obj){
//     for(var index in obj){
//         console.log("id:" + obj[index].id + " name:" + obj[index].name);
//     }
// });

// getRecentMatchesListByAccountId(220718535, function(matches){
//     console.log(matches.matches[0].champion);
//     console.log(matches.matches[0].gameId);
// });

// getMatchDetailsByGameId(2564449052, function(gameInfo){
//     console.log(JSON.stringify(gameInfo));
// });

getBullupMatchDetailsBySummonerName('Who is 55Kai', '2017/8/1', '2017/8/4', function(info){


});