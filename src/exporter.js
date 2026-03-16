const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(__dirname, 'reports');

// Убеждаемся, что папка для отчетов существует
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Генерация и сохранение отчета в файл
const saveReportToExcel = async (data, filePath) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Отчет');

  worksheet.columns = [
    { header: 'ФИО', key: 'fio', width: 30 },
    { header: 'Сотрудник', key: 'staff_name', width: 30 },
    { header: 'Оператор', key: 'staff_login', width: 15 },
    { header: 'Операция', key: 'operation_name', width: 30 },
    { header: 'Комментарий', key: 'comment', width: 50 },
    { header: 'Дата начала', key: 'start_at', width: 20 },
    { header: 'Дата завершения', key: 'finish_at', width: 20 },
    { header: 'Дата создания', key: 'created_at', width: 20 },
    { header: 'Дата обновления', key: 'updated_at', width: 20 },
  ];

  data.forEach(row => {
    worksheet.addRow({
      fio: row.fio,
      staff_name: row.staff_name,
      staff_login: row.staff_login,
      operation_name: row.operation_name,
      comment: row.comment,
      start_at: row.start_at?.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
      finish_at: row.finish_at?.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
      created_at: row.created_at.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
      updated_at: row.updated_at.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
    });
  });

  await workbook.xlsx.writeFile(filePath);
  return filePath;
};

// Экспорт отчета: сохранение + отправка в Telegram
const exportReportToExcel = async (data, chatId, bot) => {
  try {
    console.log('start exportReportToExcel');

    const reportTimestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
    const fileName = `report_${reportTimestamp}.xlsx`;
    const filePath = path.join(REPORTS_DIR, fileName);

    await saveReportToExcel(data, filePath);

    console.log(`Отчет сохранен: ${filePath}`);

    await bot.sendDocument(
      chatId,
      filePath,
      {},
      {
        filename: fileName,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    );

    console.log('end exportReportToExcel');
  } catch (error) {
    console.error('Ошибка при экспорте отчета:', error);
    await bot.sendMessage(chatId, 'Произошла ошибка при создании отчета.');
  }
};

module.exports = {
  saveReportToExcel,
  exportReportToExcel,
};