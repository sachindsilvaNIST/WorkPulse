using System.Collections.Generic;
using System.Threading.Tasks;
using NistAttendance.Models;

namespace NistAttendance.Services;

public interface IExcelExportService
{
    Task ExportToExcelAsync(List<MonthlyData> months, string filePath);
}
