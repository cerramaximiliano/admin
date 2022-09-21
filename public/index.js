'strict user'


const loginButton = document.querySelector("#loginUser");
function main (email, password){
    const xhttp = new XMLHttpRequest();
    xhttp.open("POST", "/login");
    xhttp.onreadystatechange = function(){
        if(this.readyState !== 4) return;
        if(this.status === 200){
            window.open('/home', '_self');
        
        }else if(this.status === 403){
            console.log('Modal Error autentacion')
        }else{
            console.log('Modal Error servidor', this.status)
        }
    }
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send(`email=${email}&password=${password}`);
};



loginButton.addEventListener('click', (e) => {
    e.preventDefault();
    const email = document.querySelector('#email').value;
    const password = document.querySelector('#password').value;
    main(email, password)

});