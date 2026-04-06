using System.Threading.Tasks;
using WorkPulse.Models;

namespace WorkPulse.Services;

public interface ISettingsService
{
    Task<AppSettings> LoadAsync();
    Task SaveAsync(AppSettings settings);
}
