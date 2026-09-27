package com.example.hesabdari;

import android.os.Handler;
import android.os.Looper;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Small dependency-free HTTP client for the Android app. */
public final class ApiClient {
    public interface LoginCallback {
        void onSuccess(String token, JSONObject user);
        void onError(String message);
    }

    private static final ExecutorService EXECUTOR = Executors.newCachedThreadPool();
    private static final Handler MAIN = new Handler(Looper.getMainLooper());

    private ApiClient() { }

    public static void login(String username, String password, LoginCallback callback) {
        EXECUTOR.execute(() -> {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(NetworkConfig.API_BASE_URL + "/api/login");
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(20000);
                connection.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                connection.setDoOutput(true);

                JSONObject body = new JSONObject();
                body.put("username", username);
                body.put("password", password);
                byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(bytes);
                }

                int status = connection.getResponseCode();
                InputStream stream = status >= 200 && status < 400
                        ? connection.getInputStream() : connection.getErrorStream();
                String responseText = read(stream);
                JSONObject response = new JSONObject(responseText == null ? "{}" : responseText);
                if (status >= 200 && status < 300 && response.optBoolean("success")) {
                    String token = response.optString("token", "");
                    JSONObject user = response.optJSONObject("user");
                    MAIN.post(() -> callback.onSuccess(token, user == null ? new JSONObject() : user));
                } else {
                    String message = response.optString("message", "خطا در اتصال به سرور");
                    MAIN.post(() -> callback.onError(message));
                }
            } catch (Exception error) {
                MAIN.post(() -> callback.onError("اتصال به سرور برقرار نشد."));
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    private static String read(InputStream stream) throws Exception {
        if (stream == null) return "";
        StringBuilder result = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) result.append(line);
        }
        return result.toString();
    }
}
