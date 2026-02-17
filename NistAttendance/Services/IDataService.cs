using System.Collections.Generic;
using System.Threading.Tasks;
using NistAttendance.Models;

namespace NistAttendance.Services;

public interface IDataService
{
    Task<MonthlyData?> LoadMonthAsync(int year, int month);
    Task SaveMonthAsync(MonthlyData data);
    Task<List<(int Year, int Month)>> GetAvailableMonthsAsync();
}
