// Инициализация Supabase
const supabaseUrl = 'https://lrqgnyxowgldyeaoajwt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxycWdueXhvd2dsZHllYW9hand0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NDIzNTgsImV4cCI6MjA2MjExODM1OH0.0weeWdi7n6yavJZoPBYsJdEEIgc1zgPnff3UFbx5vnE';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

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
    const { data: claims, error } = await supabase
        .from('claims')
        .select('*')
        .order('claim_date', { ascending: false });

    if (error) {
        showAlert('Ошибка при загрузке данных: ' + error.message, 'danger');
        return;
    }

    claimsTable.clear().rows.add(claims).draw();
}

// Обработка формы
$('#claimFormContent').on('submit', async function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const claimData = {};
    formData.forEach((value, key) => {
        claimData[key] = value;
    });

    try {
        if (claimData.id) {
            // Обновление существующей претензии
            const { error } = await supabase
                .from('claims')
                .update(claimData)
                .eq('id', claimData.id);

            if (error) throw error;
            showAlert('Претензия успешно обновлена', 'success');
        } else {
            // Добавление новой претензии
            const { error } = await supabase
                .from('claims')
                .insert([claimData]);

            if (error) throw error;
            showAlert('Претензия успешно добавлена', 'success');
        }
        hideForm();
    } catch (error) {
        showAlert('Ошибка: ' + error.message, 'danger');
    }
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
    const id = $(this).data('id');
    const { data: claim, error } = await supabase
        .from('claims')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        showAlert('Ошибка при загрузке претензии: ' + error.message, 'danger');
        return;
    }

    if (claim) {
        fillForm(claim);
        showForm();
    }
});

// Удаление претензии
$('#claimsDataTable').on('click', '.delete-claim', async function () {
    const id = $(this).data('id');
    if (confirm('Вы уверены, что хотите удалить эту претензию?')) {
        const { error } = await supabase
            .from('claims')
            .delete()
            .eq('id', id);

        if (error) {
            showAlert('Ошибка при удалении претензии: ' + error.message, 'danger');
        } else {
            showAlert('Претензия успешно удалена', 'success');
        }
    }
});

// Вспомогательные функции
function showForm() {
    $('#claimsTable').hide();
    $('#claimForm').show();
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

// Загрузка данных при запуске
loadClaims(); 