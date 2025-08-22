// Проверка загрузки jQuery и DataTables
$(document).ready(function () {
  if (typeof $ === 'undefined') {
    console.error('jQuery не загружен');
    return;
  }

  if (typeof $.fn.DataTable === 'undefined') {
    console.error('DataTables не загружен');
    return;
  }

  // Инициализация DataTable
  window.claimsTable = $("#claimsDataTable").DataTable({
    columnDefs: [{ targets: -1, orderable: false, searchable: false, width: 240, className: "dt-actions dt-nowrap actions-column" }],
    scrollX: true,
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
          const id = row.id || row.claim_id || '';
          return `
                    <div class="dt-actions-wrap">
      <button class="btn btn-sm btn-primary edit-claim" data-id="${id}">Редактировать</button>
                    <button class="btn btn-sm btn-danger btn-delete" data-id="${id}">Удалить</button>
    </div>
                `;
        },
      },
    ],
    scrollY: '60vh',
    scrollCollapse: true,
    fixedHeader: false
  });

  // Флаг: использовать ли серверный API для удаления/обновления (по умолчанию локально)
  const API_DELETE_ENABLED = false;

  // Сохранение данных в localStorage
  function saveClaimsToStorage() {
    const data = getClaimsTable() && getClaimsTable().rows().data().toArray();
    // гарантируем наличие id у каждой записи
    data.forEach((row) => { if (!row.id) row.id = generateId(); });
    localStorage.setItem("claims", JSON.stringify(data));
    afterClaimsUpdate();
  }

  // Загрузка данных из localStorage
  function loadClaims() {
    const saved = localStorage.getItem("claims");
    if (saved) {
      const claims = JSON.parse(saved);
      claims.forEach((row) => { if (!row.id) row.id = generateId(); });
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

  // Открытие полной формы для редактирования (универсальная)
  $("#claimsDataTable").on("click", ".edit-claim", function () {
    const row = $(this).closest("tr");
    const rowData = claimsTable.row(row).data() || {};
    // гарантируем наличие id у записи
    if (!rowData.id) {
      rowData.id = generateId();
      claimsTable.row(row).data(rowData).draw(false);
      saveClaimsToStorage();
    }
    window.currentEditingId = rowData.id;
    const camel = snakeToCamelRecord(rowData);
    fillEditForm(camel);
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

  // Обработка отправки формы редактирования
  $("#claimFormContent").off("submit").on("submit", onEditSave);


  // --- Универсальные функции и маппинг полей ---
  function generateId() {
    return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  const snakeToCamelMap = {
    id: 'claimId',
    claim_number: 'claimNumber',
    claim_date: 'claimDate',
    contractor: 'contractor',
    contract_number: 'contractNumber',
    contract_date: 'contractDate',
    amount_rub: 'amountRub',
    amount_foreign: 'amountCur',
    currency: 'currency',
    requirement: 'demand',
    responsible_employee: 'responsible',
    sent_date: 'sentDate',
    received_date: 'receivedDate',
    result: 'result',
    payment_date: 'payDate',
    paid_amount: 'paidAmount',
    transfer_to_legal_date: 'toLegalDate',
    lawsuit_date: 'lawsuitDate',
    case_number: 'caseNumber',
    lawsuit_result: 'decisionResult',
    comments: 'comments',
    documents_link: 'docsLink',
  };

  const camelToSnakeMap = Object.fromEntries(Object.entries(snakeToCamelMap).map(([s, c]) => [c, s]));

  function snakeToCamelRecord(row) {
    const out = {};
    Object.keys(snakeToCamelMap).forEach((s) => {
      const c = snakeToCamelMap[s];
      out[c] = row && row[s] != null ? row[s] : '';
    });
    // поддержка legacy ключей
    if (!out.claimId && row && row.claim_id) out.claimId = row.claim_id;
    return out;
  }

  function camelToSnakeRecord(rec) {
    const out = {};
    Object.keys(camelToSnakeMap).forEach((c) => {
      const s = camelToSnakeMap[c];
      out[s] = rec && rec[c] != null ? rec[c] : '';
    });
    if (rec && rec.claimId && !out.id) out.id = rec.claimId;
    return out;
  }

  // Конвертация дат для текстовых инпутов с placeholder 'дд/мм/гггг'
  function toInputDDMMYYYY(value) {
    return typeof toDDMMYYYY === 'function' ? toDDMMYYYY(value) : value || '';
  }
  function fromInputDDMMYYYY(value) {
    return typeof toYYYYMMDD === 'function' ? toYYYYMMDD(value) : value || '';
  }

  // Заполнить форму данными записи (camelCase по data-field)
  function fillEditForm(record) {
    const form = document.querySelector('#claimFormContent') || document;
    form.querySelectorAll('[data-field]').forEach((el) => {
      const key = el.dataset.field;
      let val = record && Object.prototype.hasOwnProperty.call(record, key) ? record[key] : '';
      if (el.getAttribute('placeholder') === 'дд/мм/гггг') val = toInputDDMMYYYY(val);
      if (el.type === 'checkbox') {
        el.checked = Boolean(val);
      } else {
        el.value = val == null ? '' : val;
      }
    });
  }

  // Считать запись из формы (camelCase по data-field)
  function readRecordFromForm() {
    const form = document.querySelector('#claimFormContent') || document;
    const rec = {};
    form.querySelectorAll('[data-field]').forEach((el) => {
      const key = el.dataset.field;
      let val;
      if (el.type === 'checkbox') {
        val = el.checked;
      } else {
        val = (el.value || '').trim();
        if (el.getAttribute('placeholder') === 'дд/мм/гггг') val = fromInputDDMMYYYY(val);
      }
      rec[key] = val;
    });
    return rec;
  }

  function getAllClaims() {
    return (getClaimsTable() && getClaimsTable().rows().data().toArray()) || [];
  }
  function getRecordById(id) {
    const list = getAllClaims();
    return list.find((r) => r && (r.id === id || r.claim_id === id)) || null;
  }
  function findIndexById(list, id) {
    return list.findIndex((r) => r && (r.id === id || r.claim_id === id));
  }
  function loadClaimsArray() {
    try { return JSON.parse(localStorage.getItem('claims') || '[]'); } catch (_) { return []; }
  }
  function saveClaims(list) {
    localStorage.setItem('claims', JSON.stringify(list));
    claimsTable.clear().rows().add(list).draw(false);
    afterClaimsUpdate();
  }
  function refreshTable() {
    claimsTable.draw(false);
    afterClaimsUpdate();
  }
  function closeEditForm() {
    $("#claimForm").hide(); $("#claimsTable").show(); $("#yearFilterRow").show();
  }
  function getCurrentEditingId() {
    const hid = document.getElementById('claimId');
    return (hid && hid.value) || window.currentEditingId || null;
  }

  // Сохранение (универсальное, мягкое слияние)
  function onEditSave(e) {
    e && e.preventDefault && e.preventDefault();
    const updatedCamel = readRecordFromForm();
    const id = updatedCamel.claimId || getCurrentEditingId();
    if (!id) { alert('Не найден идентификатор записи'); return; }
    const prevSnake = getRecordById(id);
    if (!prevSnake) { alert('Запись не найдена'); return; }

    const prevCamel = snakeToCamelRecord(prevSnake);

    // явное очищение полей при чекбоксах "Нет договора"
    const explicitClears = new Set();
    const noNum = document.getElementById('noContractEdit');
    const noDate = document.getElementById('noContractDateEdit');
    if (noNum && noNum.checked) explicitClears.add('contractNumber');
    if (noDate && noDate.checked) explicitClears.add('contractDate');

    const mergedCamel = { ...prevCamel };
    Object.keys(updatedCamel).forEach((k) => {
      const v = updatedCamel[k];
      if (k === 'claimId') { mergedCamel[k] = id; return; }
      if (explicitClears.has(k)) { mergedCamel[k] = ''; return; }
      if (v !== '' && v != null) { mergedCamel[k] = v; }
    });

    const mergedSnake = camelToSnakeRecord(mergedCamel);

    // Обновляем строку в таблице
    const api = getClaimsTable();
    const rows = api.rows().indexes().toArray();
    for (let i = 0; i < rows.length; i++) {
      const data = api.row(rows[i]).data();
      if (data && (data.id === id || data.claim_id === id)) {
        api.row(rows[i]).data(mergedSnake).draw(false);
        break;
      }
    }
    saveClaimsToStorage();
    refreshTable();
    closeEditForm();
    showAlert('Данные претензии успешно обновлены.', 'success');
  }

  // --- modal helpers ---
  const modalEl = document.getElementById('confirmDeleteModal');
  let deleteModal = null;
  let pendingDeleteId = null;

  function ensureDeleteModal() {
    if (typeof bootstrap !== 'undefined' && modalEl && !deleteModal) {
      deleteModal = new bootstrap.Modal(modalEl);
    }
    return deleteModal;
  }

  async function deleteRecord(id) {
    if (!id) return;
    if (API_DELETE_ENABLED && typeof deleteRecordOnServer === 'function') {
      await deleteRecordOnServer(id);
    } else {
      // Удаляем напрямую из DataTable и синхронизируем localStorage
      const api = getClaimsTable();
      if (!api) return;
      const idxs = api.rows().indexes().toArray();
      for (let i = 0; i < idxs.length; i++) {
        const d = api.row(idxs[i]).data();
        if (d && (d.id === id || d.claim_id === id)) {
          api.row(idxs[i]).remove();
          api.draw(false);
          saveClaimsToStorage();
          break;
        }
      }
    }
  }

  async function deleteRecordOnServer(id) {
    const res = await fetch(`/api/claims/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
  }

  function buildConfirmText(rec, fallbackId) {
    const idShown = fallbackId || '';
    const num = (rec && (rec.claim_number || rec.claimNumber || rec.number)) || '';
    const demand = (rec && (rec.requirement || rec.demand || rec.title)) || '';
    if (idShown || demand) {
      return `Вы уверены, что хотите удалить запись ${num ? `№ ${num}` : (idShown ? `id ${idShown}` : '')}${(num || idShown) && demand ? ' — ' : ''}${demand ? `«${demand}»` : ''}?`;
    }
    return 'Вы уверены, что хотите удалить запись?';
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-delete');
    if (!btn) return;
    e.preventDefault();
    const id = btn.dataset.id || btn.getAttribute('data-id');
    pendingDeleteId = id;
    const rec = getRecordById(id);
    const textEl = document.getElementById('confirmDeleteText');
    if (textEl) textEl.textContent = buildConfirmText(rec, id);
    const modal = ensureDeleteModal();
    if (modal) {
      modal.show();
    } else {
      if (window.confirm(textEl && textEl.textContent || 'Удалить запись?')) {
        confirmDeleteYesHandler();
      }
    }
  });

  async function confirmDeleteYesHandler() {
    if (!pendingDeleteId) return;
    try {
      await deleteRecord(pendingDeleteId);
      pendingDeleteId = null;
      if (deleteModal) deleteModal.hide();
      // Таблица уже перерисована внутри deleteRecord через draw(false) и saveClaimsToStorage
    } catch (err) {
      console.error(err);
      alert('Не удалось удалить запись.');
    }
  }

  document.getElementById('confirmDeleteYes') &&
    document.getElementById('confirmDeleteYes').addEventListener('click', confirmDeleteYesHandler);

  // Удаление строки и сохранение
  // handled via modal + delegated document click (see below)

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
    getClaimsTable() && getClaimsTable().rows().every(function () {
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

  // Функции форматирования дат импортируются из date_utils.js

  // --- Инициализация bootstrap-datepicker для всех дат ---
  $(function () {
    $('input[type="text"][placeholder="дд.мм.гггг"], input[type="text"][placeholder="дд/мм/гггг"]').each(function () {
      const v = $(this).val();
      if (v && v.includes('/')) $(this).val(v.replaceAll('/', '.'));
    }).datepicker({
      format: 'dd.mm.yyyy',
      language: 'ru',
      autoclose: true,
      todayHighlight: true
    }).on('changeDate', function (e) {
      // Триггерим событие input для корректной валидации required
      $(this).trigger('input');
    });
  });

  // --- При отправке упрощенной формы заявки конвертируем даты ---
  $('#claimRequestFormContent').on('submit', function () {
    $(this).find('input[type="text"][placeholder="дд.мм.гггг"], input[type="text"][placeholder="дд/мм/гггг"]').each(function () {
      const val = $(this).val();
      if (val && val.includes('/')) $(this).val(val.replaceAll('/', '.'));
      if (val) $(this).val(toYYYYMMDD($(this).val()));
    });
  });

  // fillForm больше не используется; теперь fillEditForm по data-field

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

}); // Закрытие document.ready

// --- Фильтрация по годам ---
function getYearsFromClaims() {
  const data = getClaimsTable() && getClaimsTable().rows().data().toArray();
  const years = new Set();
  data.forEach((row) => {
    if (row.claim_date) {
      // Парсим дату из формата dd.mm.yyyy или ISO
      let year;
      if (row.claim_date.includes('.')) {
        const parts = row.claim_date.split('.');
        if (parts.length === 3) year = parseInt(parts[2]);
      } else {
        year = new Date(row.claim_date).getFullYear();
      }
      if (!isNaN(year) && year > 1900 && year < 2100) years.add(year);
    }
  });
  return Array.from(years).sort((a, b) => b - a);
}
function updateYearFilter() {
  const years = getYearsFromClaims();
  const currentYear = new Date().getFullYear();
  const select = $("#yearFilter");
  select.empty();
  // Добавляем опцию "Все годы" для показа всех записей
  select.append('<option value="">Все годы</option>');
  years.forEach((year) => {
    select.append(`<option value="${year}">${year}</option>`);
  });
  // По умолчанию показываем все годы
  select.val("");
}

// --- Кастомная фильтрация по году ---
$.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
  const selectedYear = $('#yearFilter').val();
  const claimDate = data[1]; // Индекс столбца "Дата претензии" (dd.mm.yyyy)
  if (!selectedYear) return true;
  if (!claimDate) return true;
  const parts = claimDate.split('.');
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
  if (typeof dateStr === 'string' && dateStr.includes('/')) {
    // нормализуем старые строки dd/mm/yyyy -> dd.mm.yyyy
    const m = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[1]}.${m[2]}.${m[3]}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
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
    const input = $('#contractNumber');
    if (this.checked) {
      input.val('').prop('disabled', true).prop('required', false);
    } else {
      input.prop('disabled', false).prop('required', true);
    }
  });
  $('#noContractDateEdit').on('change', function () {
    const input = $('#contractDate');
    if (this.checked) {
      input.val('').prop('disabled', true).prop('required', false);
    } else {
      input.prop('disabled', false).prop('required', true);
    }
  });
});


function syncHeadMargin() {
  const body = document.querySelector('div.dataTables_scrollBody');
  const head = document.querySelector('div.dataTables_scrollHead');
  if (!body || !head) return;
  const sbw = body.offsetWidth - body.clientWidth;
  head.style.marginRight = sbw + 'px';
}
function lockColumnWidths() {
  const bodyTable = document.querySelector('div.dataTables_scrollBody table');
  const headTable = document.querySelector('div.dataTables_scrollHeadInner table');
  if (!bodyTable || !headTable) return;
  const bodyRow = bodyTable.querySelector('tbody tr');
  if (!bodyRow) return;
  const bodyCells = bodyRow.children;
  const headCells = headTable.querySelectorAll('thead th');
  if (!bodyCells || !headCells || bodyCells.length !== headCells.length) return;
  Array.from(headCells).forEach(th => th.style.width = 'auto');
  Array.from(bodyCells).forEach(td => td.style.width = 'auto');
  const widths = [];
  for (let i = 0; i < bodyCells.length; i++) {
    const w = Math.ceil(bodyCells[i].getBoundingClientRect().width);
    widths.push(w);
    headCells[i].style.width = w + 'px';
  }
  const total = widths.reduce((a, b) => a + b, 0);
  headTable.style.width = total + 'px';
  bodyTable.style.width = total + 'px';
  syncHeadMargin();
}



// Safe getter for DataTable API
function getClaimsTable() {
  if (window.claimsTable && typeof window.claimsTable.rows === 'function') return window.claimsTable;
  try {
    const api = $("#claimsDataTable").DataTable();
    if (api && typeof api.rows === 'function') { window.claimsTable = api; return api; }
  } catch (e) { }
  return null;
}

