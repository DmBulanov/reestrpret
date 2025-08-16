// Инициализация DataTable
let claimsTable = $("#claimsDataTable").DataTable({
  language: {
    processing: "Подождите...",
    search: "Поиск:",
    info: "Записи с _START_ до _END_ из _TOTAL_ записей",
    infoEmpty: "Записи с 0 до 0 из 0 записей",
    infoFiltered: "(отфильтровано из _MAX_ записей)",
    infoPostFix: "",
    loadingRecords: "Загрузка записей...",
    zeroRecords: "Записи отсутствуют",
    emptyTable: "В таблице отсутствуют данные",
    paginate: {
      first: "Первая",
      previous: "Предыдущая",
      next: "Следующая",
      last: "Последняя",
    },
    aria: {
      sortAscending: ": активировать для сортировки столбца по возрастанию",
      sortDescending: ": активировать для сортировки столбца по убыванию",
    },
  },
  order: [[1, "desc"]],
  pageLength: -1,
  paging: false,
  dom: "ti",
  columns: [
    { data: "claim_number" },
    { data: "claim_date", render: formatDateDDMMYYYY },
    { data: "contractor" },
    { data: "contract_number" },
    { data: "contract_date", render: formatDateDDMMYYYY },
    { data: "requirement" },
    { data: "amount_rub" },
    { data: "amount_foreign" },
    { data: "currency" },
    { data: "responsible_employee" },
    { data: "sent_date", render: formatDateDDMMYYYY },
    { data: "received_date", render: formatDateDDMMYYYY },
    { data: "payment_date", render: formatDateDDMMYYYY },
    { data: "paid_amount" },
    { data: "transfer_to_legal_date", render: formatDateDDMMYYYY },
    { data: "lawsuit_date", render: formatDateDDMMYYYY },
    { data: "case_number" },
    {
      data: "result",
      render: function (data) {
        switch (data) {
          case "yes":
            return "Да";
          case "no":
            return "Нет";
          case "partial":
            return "Частично";
          case "cancelled":
            return "Аннулировано";
          case "pending":
            return "Ожидает распределения";
          default:
            return data || "";
        }
      },
    },
    { data: "lawsuit_result" },
    {
      data: "comments",
      render: function (data) {
        return data || "";
      },
    },
    {
      data: null,
      orderable: false,
      searchable: false,
      render: function (data, type, row) {
        return `
                    <button class="btn btn-sm btn-primary edit-claim" data-id="${row.id || ""}">Редактировать</button>
                    <button class="btn btn-sm btn-danger delete-claim" data-id="${row.id || ""}">Удалить</button>
                `;
      },
    },
  ],
  scrollY: '60vh',
  scrollCollapse: true,
  fixedHeader: true
});

// Сохранение данных в localStorage
function saveClaimsToStorage() {
  const data = claimsTable.data().toArray();
  localStorage.setItem("claims", JSON.stringify(data));
  afterClaimsUpdate();
}

// Загрузка данных из localStorage
function loadClaims() {
  const saved = localStorage.getItem("claims");
  if (saved) {
    const claims = JSON.parse(saved);
    claimsTable.clear().rows.add(claims).draw();
  } else {
    claimsTable.clear().draw();
  }
  afterClaimsUpdate();
}

/**
 * Отправляет email-уведомление о новой или изменённой задаче
 * @param {string} toEmail - Email получателя
 * @param {string} subject - Тема письма
 * @param {string} message - Текст письма
 */
function sendEmailNotification(toEmail, subject, message) {
  // Пример интеграции с внешним email API (замените на ваш сервис)
  fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      service_id: "YOUR_SERVICE_ID",
      template_id: "YOUR_TEMPLATE_ID",
      user_id: "YOUR_USER_ID",
      template_params: {
        to_email: toEmail,
        subject: subject,
        message: message,
      },
    }),
  })
    .then((response) => {
      if (!response.ok) throw new Error("Ошибка отправки email");
      console.log("Email notification sent");
    })
    .catch((error) => {
      console.error("Email notification error:", error);
    });
}

// Открытие упрощённой формы заявки
$("#addClaim").on("click", function () {
  $("#claimsTable").hide();
  $("#claimForm").hide();
  $("#claimRequestForm").show();
  $("#claimRequestFormContent")[0].reset();
  $("#yearFilterRow").hide();
});

// Открытие полной формы для редактирования
$("#claimsDataTable").on("click", ".edit-claim", function () {
  const row = $(this).closest("tr");
  const rowData = claimsTable.row(row).data();
  fillForm(rowData);
  $("#claimForm").show();
  $("#claimsTable").hide();
  $("#claimRequestForm").hide();
  $("#claimFormContent").data("editingRow", row);
  $("#yearFilterRow").hide();
});

// Кнопка отмены для заявки
$("#cancelRequestForm").on("click", function () {
  $("#claimRequestForm").hide();
  $("#claimsTable").show();
  $("#yearFilterRow").show();
});

// Кнопка отмены для редактирования
$("#cancelForm").on("click", function () {
  $("#claimForm").hide();
  $("#claimsTable").show();
  $("#yearFilterRow").show();
});

// Обработка отправки упрощённой формы заявки
$("#claimRequestFormContent").on("submit", async function (e) {
  e.preventDefault();
  const formData = new FormData(this);
  const claimData = {
    contractor: formData.get("contractor") || "",
    contractNumber: formData.get("contractNumber") || "",
    contractDate: toYYYYMMDD(formData.get("contractDate") || ""),
    amountRub: formData.get("amountRub") || "",
    amountForeign: formData.get("amountForeign") || "",
    currency: formData.get("currency") || "",
    requirement: formData.get("requirement") || "",
    documentsLink: formData.get("documentsLink") || ""
  };

  // Отправка email через локальный сервер Flask
  try {
    const response = await fetch("http://127.0.0.1:5000/send-claim-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(claimData)
    });
    const result = await response.json();
    if (result.success) {
      alert("Заявка успешно подана и уведомление по email доставлено!");
    } else {
      alert("Заявка отправлена, но уведомление по email не доставлено.");
    }
  } catch (error) {
    console.error("Email notification error:", error);
    alert("Ошибка отправки email");
  }

  // Сохраняем заявку локально и обновляем таблицу
  claimsTable.row.add({
    contractor: claimData.contractor,
    contract_number: claimData.contractNumber,
    contract_date: claimData.contractDate,
    amount_rub: claimData.amountRub,
    amount_foreign: claimData.amountForeign,
    currency: claimData.currency,
    requirement: claimData.requirement,
    documents_link: claimData.documentsLink,
    claim_number: "",
    claim_date: "",
    responsible_employee: "",
    sent_date: "",
    received_date: "",
    payment_date: "",
    paid_amount: "",
    transfer_to_legal_date: "",
    lawsuit_date: "",
    case_number: "",
    lawsuit_result: "",
    comments: "",
    result: "pending"
  }).draw();
  saveClaimsToStorage();
  $("#claimRequestForm").hide();
  $("#claimsTable").show();
  showAlert(
    "Заявка успешно подана и ожидает распределения задачи начальником юридического отдела.",
    "success"
  );
});

// Обработка отправки полной формы редактирования
$("#claimFormContent").on("submit", function (e) {
  e.preventDefault();
  const formData = new FormData(this);
  const editingRow = $("#claimFormContent").data("editingRow");
  if (editingRow) {
    const claimData = {
      claim_number: formData.get("claimNumber") || "",
      claim_date: formData.get("claimDate") || "",
      contractor: formData.get("contractor") || "",
      contract_number: formData.get("contractNumber") || "",
      contract_date: formData.get("contractDate") || "",
      requirement: formData.get("requirement") || "",
      amount_rub: formData.get("amountRub") || "",
      amount_foreign: formData.get("amountForeign") || "",
      currency: formData.get("currency") || "",
      responsible_employee: formData.get("responsibleEmployee") || "",
      sent_date: formData.get("sentDate") || "",
      received_date: formData.get("receivedDate") || "",
      payment_date: formData.get("paymentDate") || "",
      paid_amount: formData.get("paidAmount") || "",
      transfer_to_legal_date: formData.get("transferToLegalDate") || "",
      lawsuit_date: formData.get("lawsuitDate") || "",
      case_number: formData.get("caseNumber") || "",
      lawsuit_result: formData.get("lawsuitResult") || "",
      comments: formData.get("comments") || "",
      result: formData.get("result") || "",
      documents_link: formData.get("documentsLink") || "",
    };
    claimsTable.row(editingRow).data(claimData).draw();
    $("#claimFormContent").removeData("editingRow");
    saveClaimsToStorage();
    $("#claimForm").hide();
    $("#claimsTable").show();
    $("#yearFilterRow").show();
    showAlert("Данные претензии успешно обновлены.", "success");
  }
});

// Удаление строки и сохранение
$("#claimsDataTable").on("click", ".delete-claim", function () {
  const row = $(this).closest("tr");
  claimsTable.row(row).remove().draw();
  saveClaimsToStorage();
});

// --- Экспорт в Excel: всегда все претензии ---
$("#exportExcel")
  .off("click")
  .on("click", function () {
    if (typeof XLSX === "undefined") {
      alert("Библиотека XLSX не загружена!");
      return;
    }
    // Берём все данные, а не только отфильтрованные
    const claims = JSON.parse(localStorage.getItem("claims") || "[]");
    if (!claims.length) {
      alert("Нет данных для экспорта");
      return;
    }
    function localizeResult(res) {
      switch (res) {
        case "yes":
          return "Да";
        case "no":
          return "Нет";
        case "partial":
          return "Частично";
        case "cancelled":
          return "Аннулировано";
        case "pending":
          return "Ожидает распределения";
        default:
          return res || "";
      }
    }
    const exportData = claims.map((row) => ({
      "№ претензии": row.claim_number || "",
      "Дата претензии": formatDateDDMMYYYY(row.claim_date),
      Контрагент: row.contractor || "",
      "№ договора": row.contract_number || "",
      "Дата договора": formatDateDDMMYYYY(row.contract_date),
      Требование: row.requirement || "",
      "Сумма (руб.)": row.amount_rub || "",
      "Сумма (валюта)": row.amount_foreign || "",
      Валюта: row.currency || "",
      Ответственный: row.responsible_employee || "",
      "Дата отправки": formatDateDDMMYYYY(row.sent_date),
      "Дата получения": formatDateDDMMYYYY(row.received_date),
      "Дата оплаты": formatDateDDMMYYYY(row.payment_date),
      "Оплаченная сумма": row.paid_amount || "",
      "Дата передачи в ЮО": formatDateDDMMYYYY(row.transfer_to_legal_date),
      "Дата подачи иска": formatDateDDMMYYYY(row.lawsuit_date),
      "№ дела": row.case_number || "",
      "Результат решения": row.lawsuit_result || "",
      Комментарии: row.comments || "",
      Результат: localizeResult(row.result),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Претензии");
    XLSX.writeFile(wb, "реестр_претензий.xlsx");
  });

// --- Перевод статуса 'pending' на русский в таблице ---
function localizeTableResult() {
  claimsTable.rows().every(function () {
    const data = this.data();
    if (data.result === "pending") {
      data.result = "Ожидает распределения";
      this.data(data);
    }
  });
}
claimsTable.on("draw", localizeTableResult);

// Вспомогательные функции
function showForm() {
  $("#claimsTable").hide();
  $("#claimForm").show();
  $("#claimFormContent")
    .find("input[required], textarea[required], select[required]")
    .each(function () {
      $(this)
        .off("invalid")
        .on("invalid", function () {
          this.setCustomValidity("Необходимо заполнить это поле");
        });
      $(this)
        .off("input")
        .on("input", function () {
          this.setCustomValidity("");
        });
    });
}

function hideForm() {
  $("#claimForm").hide();
  $("#claimsTable").show();
  $("#claimFormContent")[0].reset();
  $("#claimFormContent").removeData("id");
}

// --- Функция для преобразования даты из yyyy-mm-dd в dd/mm/yyyy ---
function toDDMMYYYY(input) {
  if (!input) return '';
  if (input.includes('/')) return input; // уже в нужном формате
  const [year, month, day] = input.split('-');
  if (!year || !month || !day) return input;
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  return `${dd}/${mm}/${year}`;
}

// --- Функция для преобразования даты из dd/mm/yyyy в yyyy-mm-dd (для сохранения) ---
function toYYYYMMDD(input) {
  if (!input) return '';
  if (input.includes('-')) return input; // уже в нужном формате
  const [day, month, year] = input.split('/');
  if (!year || !month || !day) return input;
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

// --- Инициализация bootstrap-datepicker для всех дат ---
$(function () {
  $('input[type="text"][placeholder="дд/мм/гггг"]').datepicker({
    format: 'dd/mm/yyyy',
    language: 'ru',
    autoclose: true,
    todayHighlight: true
  }).on('changeDate', function (e) {
    // Триггерим событие input для корректной валидации required
    $(this).trigger('input');
  });
});

// --- При отправке форм преобразую даты обратно в yyyy-mm-dd ---
$('#claimFormContent, #claimRequestFormContent').on('submit', function (e) {
  $(this).find('input[type="text"][placeholder="дд/мм/гггг"]').each(function () {
    const val = $(this).val();
    if (val && val.includes('/')) {
      $(this).val(toYYYYMMDD(val));
    }
  });
});

// --- Модифицирую fillForm, чтобы показывать даты в dd/mm/yyyy ---
function fillForm(claim) {
  const form = $("#claimFormContent");
  Object.keys(claim).forEach((key) => {
    const input = form.find(`[name="${key}"]`);
    if (input.length) {
      if (input.attr('placeholder') === 'дд/мм/гггг') {
        input.val(toDDMMYYYY(claim[key]));
      } else {
        input.val(claim[key]);
      }
    }
  });
}

function showAlert(message, type) {
  $(".alert").remove(); // Удаляем все предыдущие алерты
  const alert =
    $(`<div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`);
  $(".container-fluid.mt-4").prepend(alert);
  setTimeout(() => alert.alert("close"), 5000);
}

// Кастомные сообщения для required-полей при загрузке страницы
$(function () {
  $("#claimFormContent")
    .find("input[required], textarea[required], select[required]")
    .each(function () {
      $(this)
        .off("invalid")
        .on("invalid", function () {
          this.setCustomValidity("Необходимо заполнить это поле");
        });
      $(this)
        .off("input")
        .on("input", function () {
          this.setCustomValidity("");
        });
    });
});

// Инициализация таблицы при запуске
loadClaims();

// Явная обработка клика по 'Реестр претензий'
$("#showClaims").on("click", function (e) {
  e.preventDefault();
  $("#claimForm").hide();
  $("#claimRequestForm").hide();
  $("#claimsTable").show();
  $("#yearFilterRow").show();
});

// --- Фильтрация по годам ---
function getYearsFromClaims() {
  const data = claimsTable.data().toArray();
  const years = new Set();
  data.forEach((row) => {
    if (row.claim_date) {
      const year = new Date(row.claim_date).getFullYear();
      if (!isNaN(year)) years.add(year);
    }
  });
  return Array.from(years).sort((a, b) => b - a);
}
function updateYearFilter() {
  const years = getYearsFromClaims();
  const currentYear = new Date().getFullYear();
  const select = $("#yearFilter");
  select.empty();
  years.forEach((year) => {
    select.append(`<option value="${year}">${year}</option>`);
  });
  if (years.includes(currentYear)) {
    select.val(currentYear);
  } else if (years.length) {
    select.val(years[0]);
  }
}

// --- Кастомная фильтрация по году ---
$.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
  const selectedYear = $('#yearFilter').val();
  const claimDate = data[1]; // Индекс столбца "Дата претензии" (dd/mm/yyyy)
  if (!selectedYear) return true;
  if (!claimDate) return true;
  const parts = claimDate.split('/');
  if (parts.length !== 3) return true;
  const year = parts[2];
  return year === selectedYear;
});

$("#yearFilter").on("change", function () {
  claimsTable.draw();
});

// После загрузки данных обновляем фильтр и просто вызываем claimsTable.draw()
function afterClaimsUpdate() {
  updateYearFilter();
  claimsTable.draw();
}

// --- Функция форматирования даты в дд/мм/гггг ---
function formatDateDDMMYYYY(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// --- Логика для чекбоксов 'Нет договора' ---
$(function () {
  // Форма подачи заявки
  $('#noContractRequest').on('change', function () {
    const input = $('#contractNumberRequest');
    if (this.checked) {
      input.val('').prop('disabled', true).prop('required', false);
    } else {
      input.prop('disabled', false).prop('required', true);
    }
  });
  $('#noContractDateRequest').on('change', function () {
    const input = $('#contractDateRequest');
    if (this.checked) {
      input.val('').prop('disabled', true).prop('required', false);
    } else {
      input.prop('disabled', false).prop('required', true);
    }
  });
  // Форма редактирования
  $('#noContractEdit').on('change', function () {
    const input = $('#contractNumberEdit');
    if (this.checked) {
      input.val('').prop('disabled', true).prop('required', false);
    } else {
      input.prop('disabled', false).prop('required', true);
    }
  });
  $('#noContractDateEdit').on('change', function () {
    const input = $('#contractDateEdit');
    if (this.checked) {
      input.val('').prop('disabled', true).prop('required', false);
    } else {
      input.prop('disabled', false).prop('required', true);
    }
  });
});
