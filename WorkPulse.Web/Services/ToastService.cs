namespace WorkPulse.Web.Services;

public enum ToastLevel { Success, Error, Warning, Info }

public class ToastMessage
{
    public string Id { get; } = Guid.NewGuid().ToString("N")[..8];
    public ToastLevel Level { get; init; }
    public string Text { get; init; } = "";
    public DateTime CreatedUtc { get; } = DateTime.UtcNow;
}

public class ToastService
{
    private readonly List<ToastMessage> _messages = new();
    public IReadOnlyList<ToastMessage> Messages => _messages;

    public event Action? OnChange;

    public void Show(string text, ToastLevel level = ToastLevel.Info)
    {
        _messages.Add(new ToastMessage { Level = level, Text = text });
        OnChange?.Invoke();
    }

    public void Success(string text) => Show(text, ToastLevel.Success);
    public void Error(string text) => Show(text, ToastLevel.Error);
    public void Warning(string text) => Show(text, ToastLevel.Warning);
    public void Info(string text) => Show(text, ToastLevel.Info);

    public void Remove(string id)
    {
        _messages.RemoveAll(m => m.Id == id);
        OnChange?.Invoke();
    }
}
