function isInt(value) {
    return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value))
};
function getLength(number) {
    return number.toString().length;
};
function countDecimals (number) {
if(Math.floor(number.valueOf()) === number.valueOf()) return 0;
return number.toString().split(".")[1].length || 0; 
};
function compareArray (arr1, arr2){
if (arr1.length === arr2.length){
    return false
}else{
    return true
}
};

module.exports = {isInt, getLength, countDecimals, compareArray}
