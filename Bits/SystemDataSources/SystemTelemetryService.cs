using System.Diagnostics;
using System.Net.NetworkInformation;
using System.Runtime.InteropServices;

namespace StreamCraft.Bits.SystemDataSources;

public sealed class SystemTelemetryService
{
    private readonly object _cpuLock = new();
    private readonly object _networkLock = new();
    private readonly TimeSpan _minSampleInterval = TimeSpan.FromSeconds(1);

    private CpuSample? _cpuSample;
    private DateTime _cpuSampleUtc;

    private NetworkSample? _networkSample;
    private DateTime _networkSampleUtc;

    public object GetCpuSnapshot()
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            return new { TimestampUtc = DateTime.UtcNow, UsagePercent = (double?)null, Status = "unavailable" };
        }

        lock (_cpuLock)
        {
            var now = DateTime.UtcNow;
            if (_cpuSample is not null && now - _cpuSampleUtc < _minSampleInterval)
            {
                return new { TimestampUtc = _cpuSampleUtc, UsagePercent = _cpuSample.UsagePercent };
            }

            if (!TryGetSystemTimes(out var idle, out var kernel, out var user))
            {
                return new { TimestampUtc = now, UsagePercent = (double?)null, Status = "unavailable" };
            }

            var current = new CpuRaw(idle, kernel, user);
            var usage = CalculateCpuUsage(_cpuSample?.Raw, current);
            _cpuSample = new CpuSample(current, usage);
            _cpuSampleUtc = now;

            return new { TimestampUtc = now, UsagePercent = usage, Status = usage is null ? "warming" : null };
        }
    }

    public object GetMemorySnapshot()
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            return new { TimestampUtc = DateTime.UtcNow, TotalBytes = (ulong?)null, AvailableBytes = (ulong?)null, Status = "unavailable" };
        }

        var status = new MemoryStatusEx();
        status.dwLength = (uint)Marshal.SizeOf(status);
        if (!GlobalMemoryStatusEx(ref status))
        {
            return new { TimestampUtc = DateTime.UtcNow, TotalBytes = (ulong?)null, AvailableBytes = (ulong?)null, Status = "unavailable" };
        }

        var used = status.ullTotalPhys - status.ullAvailPhys;
        var percent = status.ullTotalPhys == 0 ? (double?)null : Math.Round(used * 100d / status.ullTotalPhys, 2);

        return new
        {
            TimestampUtc = DateTime.UtcNow,
            TotalBytes = status.ullTotalPhys,
            AvailableBytes = status.ullAvailPhys,
            UsedBytes = used,
            UsagePercent = percent
        };
    }

    public object GetNetworkSnapshot()
    {
        lock (_networkLock)
        {
            var now = DateTime.UtcNow;
            if (_networkSample is not null && now - _networkSampleUtc < _minSampleInterval)
            {
                return new
                {
                    TimestampUtc = _networkSampleUtc,
                    UploadMbps = _networkSample.UploadMbps,
                    DownloadMbps = _networkSample.DownloadMbps
                };
            }

            var totals = GetNetworkTotals();
            if (totals is null)
            {
                return new { TimestampUtc = now, UploadMbps = (double?)null, DownloadMbps = (double?)null, Status = "unavailable" };
            }

            var (sentBytes, receivedBytes) = totals.Value;
            double? upload = null;
            double? download = null;

            if (_networkSample is not null)
            {
                var elapsed = now - _networkSampleUtc;
                var seconds = Math.Max(elapsed.TotalSeconds, 0.001);
                upload = Math.Round(((sentBytes - _networkSample.SentBytes) * 8d) / seconds / 1_000_000d, 3);
                download = Math.Round(((receivedBytes - _networkSample.ReceivedBytes) * 8d) / seconds / 1_000_000d, 3);
            }

            _networkSample = new NetworkSample(sentBytes, receivedBytes, upload, download);
            _networkSampleUtc = now;

            return new
            {
                TimestampUtc = now,
                UploadMbps = upload,
                DownloadMbps = download,
                Status = upload is null && download is null ? "warming" : null
            };
        }
    }

    public object GetDiskUsageSnapshot()
    {
        try
        {
            var drives = DriveInfo.GetDrives()
                .Where(drive => drive.IsReady)
                .Select(drive => new
                {
                    drive.Name,
                    TotalGb = Math.Round(drive.TotalSize / 1024d / 1024d / 1024d, 2),
                    FreeGb = Math.Round(drive.AvailableFreeSpace / 1024d / 1024d / 1024d, 2)
                })
                .ToArray();

            return new
            {
                TimestampUtc = DateTime.UtcNow,
                Drives = drives
            };
        }
        catch
        {
            return new { TimestampUtc = DateTime.UtcNow, Drives = Array.Empty<object>() };
        }
    }

    public object GetUptimeSnapshot()
    {
        return new
        {
            TimestampUtc = DateTime.UtcNow,
            UptimeMilliseconds = Environment.TickCount64
        };
    }

    public object GetTimeSnapshot()
    {
        return new
        {
            Utc = DateTime.UtcNow,
            Local = DateTime.Now
        };
    }

    public object GetTimezoneSnapshot()
    {
        return new
        {
            Id = TimeZoneInfo.Local.Id,
            DisplayName = TimeZoneInfo.Local.DisplayName
        };
    }

    public object GetHostSnapshot()
    {
        return new { MachineName = Environment.MachineName };
    }

    public object GetUserSnapshot()
    {
        return new { UserName = Environment.UserName, Domain = Environment.UserDomainName };
    }

    public object GetOsSnapshot()
    {
        return new
        {
            Description = RuntimeInformation.OSDescription,
            Version = Environment.OSVersion.VersionString,
            Architecture = RuntimeInformation.OSArchitecture.ToString()
        };
    }

    public object GetTopProcessesByMemory()
    {
        var processes = Process.GetProcesses()
            .OrderByDescending(p =>
            {
                try { return p.WorkingSet64; } catch { return 0; }
            })
            .Take(8)
            .Select(p =>
            {
                long memory = 0;
                try { memory = p.WorkingSet64; } catch { }
                return new
                {
                    p.Id,
                    p.ProcessName,
                    MemoryMb = Math.Round(memory / 1024d / 1024d, 2)
                };
            })
            .ToArray();

        return new
        {
            TimestampUtc = DateTime.UtcNow,
            TotalProcesses = processes.Length,
            TopProcesses = processes
        };
    }

    public object GetTopProcessesByCpu()
    {
        var processes = Process.GetProcesses()
            .OrderByDescending(p =>
            {
                try { return p.TotalProcessorTime.TotalMilliseconds; } catch { return 0; }
            })
            .Take(8)
            .Select(p =>
            {
                double cpuMs = 0;
                try { cpuMs = p.TotalProcessorTime.TotalMilliseconds; } catch { }
                return new
                {
                    p.Id,
                    p.ProcessName,
                    CpuMs = Math.Round(cpuMs, 2)
                };
            })
            .ToArray();

        return new
        {
            TimestampUtc = DateTime.UtcNow,
            TopProcesses = processes
        };
    }

    private static (ulong SentBytes, ulong ReceivedBytes)? GetNetworkTotals()
    {
        try
        {
            ulong sent = 0;
            ulong received = 0;
            var interfaces = NetworkInterface.GetAllNetworkInterfaces()
                .Where(nic =>
                    nic.OperationalStatus == OperationalStatus.Up &&
                    nic.NetworkInterfaceType != NetworkInterfaceType.Loopback &&
                    nic.NetworkInterfaceType != NetworkInterfaceType.Tunnel);

            foreach (var nic in interfaces)
            {
                var stats = nic.GetIPStatistics();
                sent += (ulong)stats.BytesSent;
                received += (ulong)stats.BytesReceived;
            }

            return (sent, received);
        }
        catch
        {
            return null;
        }
    }

    private static double? CalculateCpuUsage(CpuRaw? previous, CpuRaw current)
    {
        if (previous is null)
        {
            return null;
        }

        var idleDelta = current.Idle - previous.Idle;
        var kernelDelta = current.Kernel - previous.Kernel;
        var userDelta = current.User - previous.User;
        var total = kernelDelta + userDelta;
        if (total <= 0)
        {
            return null;
        }

        var usage = (total - idleDelta) * 100d / total;
        return Math.Round(Math.Clamp(usage, 0d, 100d), 2);
    }

    private static bool TryGetSystemTimes(out ulong idle, out ulong kernel, out ulong user)
    {
        if (!GetSystemTimes(out var idleTime, out var kernelTime, out var userTime))
        {
            idle = 0;
            kernel = 0;
            user = 0;
            return false;
        }

        idle = idleTime.ToUInt64();
        kernel = kernelTime.ToUInt64();
        user = userTime.ToUInt64();
        return true;
    }

    private sealed record CpuSample(CpuRaw Raw, double? UsagePercent);

    private sealed record CpuRaw(ulong Idle, ulong Kernel, ulong User);

    private sealed record NetworkSample(ulong SentBytes, ulong ReceivedBytes, double? UploadMbps, double? DownloadMbps);

    [StructLayout(LayoutKind.Sequential)]
    private struct FileTime
    {
        public uint dwLowDateTime;
        public uint dwHighDateTime;

        public ulong ToUInt64() => ((ulong)dwHighDateTime << 32) | dwLowDateTime;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MemoryStatusEx
    {
        public uint dwLength;
        public uint dwMemoryLoad;
        public ulong ullTotalPhys;
        public ulong ullAvailPhys;
        public ulong ullTotalPageFile;
        public ulong ullAvailPageFile;
        public ulong ullTotalVirtual;
        public ulong ullAvailVirtual;
        public ulong ullAvailExtendedVirtual;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetSystemTimes(out FileTime idleTime, out FileTime kernelTime, out FileTime userTime);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GlobalMemoryStatusEx(ref MemoryStatusEx buffer);
}



