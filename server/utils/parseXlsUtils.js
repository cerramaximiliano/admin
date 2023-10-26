const {isInt, getLength, countDecimals} = require('./mathUtils');
const moment = require('moment');

const parseDataForIclCer = (tempData) => {
    let parsedData = [];
    let data = [];
    let dataIndex = [];
    tempData.forEach(function(x){
        Object.keys(x).forEach(function(arr){
            // console.log(arr, x)
            if(isInt(x[arr]) === true){
                if(getLength(x[arr]) === 8 && moment(x[arr], "YYYYMMDD").isValid()){
                data.push(x[arr]);
                }
            }else if(typeof x[arr] === 'number' && arr === 'INTEREST RATES AND ADJUSTMENT COEFFICIENTS ESTABLISHED BY THE BCRA'){
                if(countDecimals(x[arr]) >= 1) {
                    dataIndex.push(x[arr])
                }else {
                    false
                }  
            }
        });
        data[0] != undefined && dataIndex[0] != undefined ? parsedData.push([data[0], dataIndex[0]]) : false
        data = [];
        dataIndex = [];
    });
    return parsedData
};


const parseDataForPasivaBcra = (tempData) => {
    let parsedData = [];
    let data = [];
    let dataIndex = [];
    tempData.forEach(function(x, index){
        Object.keys(x).forEach(function(arr, ind, total){
            if(isInt(x[arr]) === true){
                if(getLength(x[arr]) === 8 && moment(x[arr], "YYYYMMDD").isValid()){
                    data.push(x[arr]);
                    if(data.length === 2){
                        dataIndex.push(x[total[total.length-1]])
                    }
                }else{
                    false
                }
            }else{
                false
            }
        });
        if(data.length >= 3){
            parsedData.push([data[data.length-1],dataIndex[0]]);
        }else if (data.length === 2){
            parsedData.push([data[1],dataIndex[0]]);
        }else{
            false
        };
        data = [];
        dataIndex = [];
    });
    return parsedData;
}


module.exports = {parseDataForIclCer, parseDataForPasivaBcra};