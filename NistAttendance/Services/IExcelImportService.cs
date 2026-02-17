using System.Collections.Generic;
using System.Threading.Tasks;
using NistAttendance.Models;

namespace NistAttendance.Services;

public interface IExcelImportService
{
    Task<List<MonthlyData>> ImportFromExcelAsync(string filePath);
}
