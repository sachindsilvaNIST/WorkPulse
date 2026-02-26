using System.Threading.Tasks;
using NistAttendance.Models;

namespace NistAttendance.Services;

public interface ISettingsService
{
    Task<AppSettings> LoadAsync();
    Task SaveAsync(AppSettings settings);
}
