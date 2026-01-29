using System.Reflection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Engine.Attributes;
using Engine.Controllers;
using Serilog;
using RouteAttribute = Engine.Attributes.RouteAttribute;

namespace Engine.Services;

public class ControllerDiscoveryService
{
    private readonly ILogger? _logger;
    private readonly List<Type> _controllerTypes = new();

    public ControllerDiscoveryService(ILogger? logger)
    {
        _logger = logger;
    }

    public void DiscoverControllers()
    {
        var controllerType = typeof(BaseController);
        var assembly = Assembly.GetExecutingAssembly();

        var types = assembly.GetTypes()
            .Where(t => t.IsClass && !t.IsAbstract && controllerType.IsAssignableFrom(t));

        foreach (var type in types)
        {
            _controllerTypes.Add(type);
            _logger?.Information("Discovered controller: {ControllerType}", type.Name);
        }

        _logger?.Information("Discovered {Count} controllers", _controllerTypes.Count);
    }

    public void RegisterControllerServices(IServiceCollection services)
    {
        // Register all discovered controllers as transient services
        foreach (var controllerType in _controllerTypes)
        {
            services.AddTransient(controllerType);
            _logger?.Debug("Registered controller service: {ControllerType}", controllerType.Name);
        }
    }

    public void RegisterRoutes(WebApplication app)
    {
        var registeredRoutes = new HashSet<string>();

        foreach (var controllerType in _controllerTypes)
        {
            var classRouteAttr = controllerType.GetCustomAttribute<RouteAttribute>();
            var classCorsAttr = controllerType.GetCustomAttribute<EnableCorsAttribute>();

            var methods = controllerType.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly);

            foreach (var method in methods)
            {
                var methodRouteAttr = method.GetCustomAttribute<RouteAttribute>();
                var httpMethodAttr = method.GetCustomAttribute<HttpMethodAttribute>();
                var methodCorsAttr = method.GetCustomAttribute<EnableCorsAttribute>();

                if (httpMethodAttr == null) continue;

                var corsAttr = methodCorsAttr ?? classCorsAttr;

                // Combine class route and method route
                var route = classRouteAttr?.Path ?? "";
                if (methodRouteAttr != null)
                {
                    route = methodRouteAttr.Path;
                }

                if (string.IsNullOrEmpty(route)) continue;

                var routeKey = $"{httpMethodAttr.Method}:{route}";
                if (registeredRoutes.Contains(routeKey))
                {
                    _logger?.Warning("Route already registered: {Route}", routeKey);
                    continue;
                }

                registeredRoutes.Add(routeKey);

                switch (httpMethodAttr.Method)
                {
                    case Attributes.HttpMethod.Get:
                        app.MapGet(route, async (HttpContext context) =>
                        {
                            ApplyCorsHeaders(context, corsAttr);
                            using var scope = app.Services.CreateScope();
                            var controller = (BaseController)scope.ServiceProvider.GetRequiredService(controllerType);
                            controller.Initialize(_logger);

                            var result = method.Invoke(controller, new object[] { });
                            if (result is Task<IActionResult> taskResult)
                            {
                                await ExecuteResult(await taskResult, context);
                            }
                            else if (result is IActionResult actionResult)
                            {
                                await ExecuteResult(actionResult, context);
                            }
                        });
                        break;

                    case Attributes.HttpMethod.Post:
                        app.MapPost(route, async (HttpContext context) =>
                        {
                            ApplyCorsHeaders(context, corsAttr);
                            using var scope = app.Services.CreateScope();
                            var controller = (BaseController)scope.ServiceProvider.GetRequiredService(controllerType);
                            controller.Initialize(_logger);

                            // Get method parameters
                            var parameters = method.GetParameters();
                            var args = new object[parameters.Length];

                            for (int i = 0; i < parameters.Length; i++)
                            {
                                var param = parameters[i];
                                var fromQueryAttr = param.GetCustomAttribute<Microsoft.AspNetCore.Mvc.FromQueryAttribute>();

                                if (fromQueryAttr != null)
                                {
                                    // Bind from query string
                                    var instance = Activator.CreateInstance(param.ParameterType);
                                    foreach (var prop in param.ParameterType.GetProperties())
                                    {
                                        if (context.Request.Query.TryGetValue(prop.Name, out var value))
                                        {
                                            var convertedValue = Convert.ChangeType(value.ToString(), prop.PropertyType);
                                            prop.SetValue(instance, convertedValue);
                                        }
                                    }
                                    args[i] = instance!;
                                }
                            }

                            var result = method.Invoke(controller, args);
                            if (result is Task<IActionResult> taskResult)
                            {
                                await ExecuteResult(await taskResult, context);
                            }
                            else if (result is IActionResult actionResult)
                            {
                                await ExecuteResult(actionResult, context);
                            }
                        });
                        break;

                    case Attributes.HttpMethod.Put:
                        app.MapPut(route, async (HttpContext context) =>
                        {
                            ApplyCorsHeaders(context, corsAttr);
                            using var scope = app.Services.CreateScope();
                            var controller = (BaseController)scope.ServiceProvider.GetRequiredService(controllerType);
                            controller.Initialize(_logger);

                            var result = method.Invoke(controller, new object[] { });
                            if (result is Task<IActionResult> taskResult)
                            {
                                await ExecuteResult(await taskResult, context);
                            }
                            else if (result is IActionResult actionResult)
                            {
                                await ExecuteResult(actionResult, context);
                            }
                        });
                        break;

                    case Attributes.HttpMethod.Delete:
                        app.MapDelete(route, async (HttpContext context) =>
                        {
                            ApplyCorsHeaders(context, corsAttr);
                            using var scope = app.Services.CreateScope();
                            var controller = (BaseController)scope.ServiceProvider.GetRequiredService(controllerType);
                            controller.Initialize(_logger);

                            var result = method.Invoke(controller, new object[] { });
                            if (result is Task<IActionResult> taskResult)
                            {
                                await ExecuteResult(await taskResult, context);
                            }
                            else if (result is IActionResult actionResult)
                            {
                                await ExecuteResult(actionResult, context);
                            }
                        });
                        break;
                }

                _logger?.Information("Registered route: {Method} {Route} → {Controller}.{Method}",
                    httpMethodAttr.Method, route, controllerType.Name, method.Name);
            }
        }
    }

    private async Task ExecuteResult(IActionResult result, HttpContext context)
    {
        var actionContext = new Microsoft.AspNetCore.Mvc.ActionContext(context, new Microsoft.AspNetCore.Routing.RouteData(), new Microsoft.AspNetCore.Mvc.Abstractions.ActionDescriptor());
        await result.ExecuteResultAsync(actionContext);
    }

    private void ApplyCorsHeaders(HttpContext context, EnableCorsAttribute? corsAttr)
    {
        if (corsAttr == null) return;

        context.Response.Headers.Append("Access-Control-Allow-Origin", corsAttr.AllowOrigin);
        context.Response.Headers.Append("Access-Control-Allow-Methods", corsAttr.AllowMethods);
        context.Response.Headers.Append("Access-Control-Allow-Headers", corsAttr.AllowHeaders);
    }
}
