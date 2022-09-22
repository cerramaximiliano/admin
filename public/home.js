'use strict';
window.addEventListener("load", () => {

const modalEmails = new bootstrap.Modal(document.querySelector('#modal-EmailMarketing'));
const forms = document.querySelector('.needs-validation');


document.querySelector('#updateData').addEventListener('click', (e) => {
    const select = document.querySelector('#selectUpdateData');
    const optionSelected = select.options[select.selectedIndex].value;
    let requestOptions = {
        method: "GET",
        redirect: "follow",
      };
    fetch(`tasas/?tasa=${optionSelected}`, requestOptions)
    .then((result) => {
        toastr.success(`Tasa de interés actualizada: ${optionSelected}`)
    })
    .catch((err) => {
        toastr.error(`Ha ocurrido un error en el servidor: ${err}`)
    })
})
toastr.options = {
    "closeButton": false,
    "debug": false,
    "newestOnTop": false,
    "progressBar": false,
    "positionClass": "toast-top-center",
    "preventDuplicates": false,
    "onclick": null,
    "showDuration": "300",
    "hideDuration": "1000",
    "timeOut": "10000",
    "extendedTimeOut": "1000",
    "showEasing": "swing",
    "hideEasing": "linear",
    "showMethod": "fadeIn",
    "hideMethod": "fadeOut"
  };

document.querySelector("#add-Emails").addEventListener('click', (e) => {
    document.querySelector("#selectEmailType").classList.remove('d-none');
    document.querySelector("#modalEmailTitle").innerHTML = "Agregar Emails";
    document.querySelector('#validateEmail').classList.remove('was-validated');
    document.querySelector("#selectType").required = true;
    document.querySelector("#add-EmailsList").innerHTML= "Agregar";
    modalEmails.show();
});
document.querySelector("#add-EmailsList").addEventListener('click', (e) => {
    if(forms.checkValidity() === true){
        const emails = document.querySelector("#emailsArea").value;
        const select = document.querySelector("#selectType");
        const optionSelected = select.options[select.selectedIndex].value;
        const emailsList = Papa.parse(emails);
        var myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
        var urlencoded = new URLSearchParams();
        urlencoded.append("email", JSON.stringify(emailsList.data));
        urlencoded.append("type", optionSelected);
        var requestOptions = {
          method: "POST",
          headers: myHeaders,
          body: urlencoded,
          redirect: "follow",
        };
        let url;
        if(e.target.innerHTML === "Agregar"){
            url = '/emailpromotion';
        }else{
            url = '/emailpromotion-erase';
        }
        fetch(url, requestOptions)
        .then((res) => res.json())
        .then((result) => {
            console.log(result)
            if(url === '/emailpromotion'){
                if(result.err != undefined){
                    if(result.err.code === 11000){
                        toastr.error(`<p>Items totales: ${result.err.result.insertedIds.length}</p><p>Items insertados sin error: ${result.err.result.nInserted}</p><p>Items no insertados: ${result.err.writeErrors.length}</p>`)
                    }else{
                        toastr.error(`Ha ocurrido un error en el servidor.`);
                    }
                }else{
                    toastr.success(`Items insertados sin error: ${result.result.length}`)
                }
            }else{
                if(result.result.matchedCount != undefined && result.result.matchedCount > 0){
                    toastr.success(`<p>Items eliminados: ${result.result.modifiedCount}</p><p>Items encontrados: ${result.result.matchedCount}</p>`)
                }else if ( result.result.matchedCount != undefined && result.result.matchedCount === 0 ){
                    toastr.error('No se han encontrado los registros que intenta eliminar.')
                }else{
                    toastr.error('No se han encontrado los registros que intenta eliminar.')
                }
            }
            modalEmails.hide();
        })
        .catch((err) => {
            console.log(err)
            toastr.error(`Ha ocurrido un error en el servidor. Error Code: ${err}`);
            modalEmails.hide();
        });
    }else{
        document.querySelector('#validateEmail').classList.add('was-validated');
    }
});


document.querySelector("#sub-Emails").addEventListener('click', (e) => {
    document.querySelector("#selectEmailType").classList.add('d-none');
    document.querySelector("#modalEmailTitle").innerHTML = "Quitar Emails";
    document.querySelector('#validateEmail').classList.remove('was-validated');
    document.querySelector("#add-EmailsList").innerHTML= "Quitar";
    document.querySelector("#selectType").required = false;
    modalEmails.show();
});


document.querySelector('#view-Email').addEventListener('click',function(e) {
    window.open('/emailusers', '_self');
});


});