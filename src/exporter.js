const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Функция для экспорта отчета в Excel
const exportReportToExcel = async (data, chatId, bot) => {
  try {
    // Создаем новый Excel файл
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Отчет');

    // Добавляем заголовки столбцов
    worksheet.columns = [
      { header: 'ФИО', key: 'fio', width: 30 },
      { header: 'Сотрудник', key: 'staff_name', width: 30 },
      { header: 'Операция', key: 'operation_name', width: 30 },
      { header: 'Комментарий', key: 'comment', width: 50 },
      { header: 'Дата начала', key: 'start_at', width: 20 },
      { header: 'Дата завершения', key: 'finish_at', width: 20 },
      { header: 'Дата создания', key: 'created_at', width: 20 },
      { header: 'Дата обновления', key: 'updated_at', width: 20 },
    ];

    // Добавляем строки данных
    data.forEach(row => {
      console.log({row});
      worksheet.addRow({
        fio: row.fio,
        staff_name: row.staff_name,
        operation_name: row.operation_name,
        comment: row.comment,
        start_at: row.start_at?.toLocaleString('ru-RU'),
        finish_at: row.finish_at?.toLocaleString('ru-RU'),
        created_at: row.created_at.toLocaleString('ru-RU'),
        updated_at: row.updated_at.toLocaleString('ru-RU'),
      });
    });

    // Генерируем файл
    const filePath = path.join(__dirname, 'report.xlsx');
    await workbook.xlsx.writeFile(filePath);

    // Отправляем файл пользователю
    await bot.sendDocument(chatId, filePath);

    // Удаляем файл после отправки
    fs.unlinkSync(filePath);
  } catch (error) {
    console.error('Ошибка при экспорте отчета:', error);
    await bot.sendMessage(chatId, "Произошла ошибка при создании отчета.");
  }
};

// Экспортируем функцию
module.exports = {
  exportReportToExcel
};
