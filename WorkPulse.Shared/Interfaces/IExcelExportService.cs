using System.Collections.Generic;
using System.Threading.Tasks;
using WorkPulse.Models;

namespace WorkPulse.Services;

public interface IExcelExportService
{
    Task ExportToExcelAsync(List<MonthlyData> months, string filePath);
}
