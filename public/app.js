// Инициализация Supabase
// const supabaseUrl = 'https://lrqgnyxowgldyeaoajwt.supabase.co';
// const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxycWdueXhvd2dsZHllYW9hand0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NDIzNTgsImV4cCI6MjA2MjExODM1OH0.0weeWdi7n6yavJZoPBYsJdEEIgc1zgPnff3UFbx5vnE';
// const supabase = window.Supabase.createClient(supabaseUrl, supabaseKey);

// Инициализация DataTable
let claimsTable = $('#claimsDataTable').DataTable({
    language: {
        url: '//cdn.datatables.net/plug-ins/1.10.24/i18n/Russian.json'
    },
    order: [[1, 'desc']],
    pageLength: 25,
    columns: [
        { data: 'claim_number' },
        { data: 'claim_date' },
        { data: 'contractor' },
        { data: 'contract_number' },
        { data: 'contract_date' },
        { data: 'requirement' },
        { data: 'amount_rub' },
        { data: 'amount_foreign' },
        { data: 'currency' },
        { data: 'responsible_employee' },
        { data: 'result' },
        {
            data: null,
            render: function (data, type, row) {
                return `
                    <button class="btn btn-sm btn-primary edit-claim" data-id="${row.id}">Редактировать</button>
                    <button class="btn btn-sm btn-danger delete-claim" data-id="${row.id}">Удалить</button>
                `;
            }
        }
    ]
});

// Загрузка данных из Supabase
async function loadClaims() {
    // const { data: claims, error } = await supabase
    //     .from('claims')
    //     .select('*')
    //     .order('claim_date', { ascending: false });

    // if (error) {
    //     showAlert('Ошибка при загрузке данных: ' + error.message, 'danger');
    //     return;
    // }

    // claimsTable.clear().rows.add(claims).draw();
    claimsTable.clear().draw();
}

// Обработка формы
$('#claimFormContent').on('submit', async function (e) {
    e.preventDefault();
    showAlert('Сохранение временно отключено для доработки проекта', 'warning');
    hideForm();
});

// Экспорт в Excel
$('#exportExcel').on('click', function () {
    const claims = claimsTable.data().toArray();
    const ws = XLSX.utils.json_to_sheet(claims);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Претензии");
    XLSX.writeFile(wb, "реестр_претензий.xlsx");
});

// Обработчики событий
$('#addClaim').on('click', function () {
    showForm();
});

$('#showClaims').on('click', function () {
    hideForm();
});

$('#cancelForm').on('click', function () {
    hideForm();
});

// Редактирование претензии
$('#claimsDataTable').on('click', '.edit-claim', async function () {
    showAlert('Редактирование временно отключено для доработки проекта', 'warning');
});

// Удаление претензии
$('#claimsDataTable').on('click', '.delete-claim', async function () {
    showAlert('Удаление временно отключено для доработки проекта', 'warning');
});

// Вспомогательные функции
function showForm() {
    $('#claimsTable').hide();
    $('#claimForm').show();
    // Кастомное сообщение для required-полей (назначается при каждом показе формы)
    $('#claimFormContent').find('input[required], textarea[required], select[required]').each(function () {
        $(this).off('invalid').on('invalid', function (e) {
            this.setCustomValidity('Необходимо заполнить это поле');
        });
        $(this).off('input').on('input', function (e) {
            this.setCustomValidity('');
        });
    });
}

function hideForm() {
    $('#claimForm').hide();
    $('#claimsTable').show();
    $('#claimFormContent')[0].reset();
    $('#claimFormContent').removeData('id');
}

function fillForm(claim) {
    const form = $('#claimFormContent');
    Object.keys(claim).forEach(key => {
        const input = form.find(`[name="${key}"]`);
        if (input.length) {
            input.val(claim[key]);
        }
    });
}

function showAlert(message, type) {
    const alert = $(`<div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`);
    $('.container-fluid').prepend(alert);
    setTimeout(() => alert.alert('close'), 5000);
}

// Кастомное сообщение для required-полей (назначается при загрузке страницы)
$(function () {
    $('#claimFormContent').find('input[required], textarea[required], select[required]').each(function () {
        $(this).off('invalid').on('invalid', function (e) {
            this.setCustomValidity('Необходимо заполнить это поле');
        });
        $(this).off('input').on('input', function (e) {
            this.setCustomValidity('');
        });
    });
});

// Загрузка данных при запуске
loadClaims(); 