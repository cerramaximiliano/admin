'use strict';
window.addEventListener("load", () => {

const modalEmails = new bootstrap.Modal(document.querySelector('#modal-EmailMarketing'));



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

document.querySelector("#add-Emails").addEventListener('click', (e) => {
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
      }
    modalEmails.show();
});
document.querySelector("#add-EmailsList").addEventListener('click', (e) => {
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
    fetch('/emailpromotion', requestOptions)
    .then((res) => res.json())
    .then((result) => {
        if(result.err != undefined){
            if(result.err.code === 11000){
                toastr.error(`<p>
                            Items totales: ${result.err.result.insertedIds.length}
                            </p>
                            <p>
                            Items insertados sin error: ${result.err.result.nInserted}
                            </p>
                            <p>
                            Items no insertados: ${result.err.writeErrors.length}
                            </p>
                            `
                )


            }
        }else{
            toastr.success(`Items insertados sin error: ${result.result.length}`)
        }
        modalEmails.hide();
    })
    .catch((err) => {
        console.log(err)
    });
});

document.querySelector('#view-Email').addEventListener('click',function(e) {
    window.open('/emailusers', '_self');
    // var requestOptions = {
    //   method: "GET",
    //   redirect: "follow",
    // };
    // fetch('/emailusers', requestOptions)
    // .then((res) => res.json())
    // .then((results) => {
    //     console.log(results)
    // })
    // .catch((err) => {
    //     console.log(err)
    // })
});


});