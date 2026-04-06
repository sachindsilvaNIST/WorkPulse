using System.Collections.Generic;
using System.Threading.Tasks;
using WorkPulse.Models;

namespace WorkPulse.Services;

public interface IExcelImportService
{
    Task<List<MonthlyData>> ImportFromExcelAsync(string filePath);
}
