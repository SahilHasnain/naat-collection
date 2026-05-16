import React from "react";

export default function PrivacyPolicy() {
    return (
        <div style={{
            minHeight: "100vh",
            backgroundColor: "#ffffff",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
        }}>
            <div style={{
                maxWidth: "800px",
                margin: "0 auto",
                padding: "48px 24px"
            }}>
                <h1 style={{
                    fontSize: "36px",
                    fontWeight: "bold",
                    color: "#111827",
                    marginBottom: "16px"
                }}>
                    Privacy Policy
                </h1>
                <p style={{
                    fontSize: "14px",
                    color: "#6B7280",
                    marginBottom: "32px"
                }}>
                    Last updated: {new Date().toLocaleDateString()}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                    <section>
                        <h2 style={{
                            fontSize: "24px",
                            fontWeight: "600",
                            color: "#111827",
                            marginBottom: "12px"
                        }}>
                            1. Introduction
                        </h2>
                        <p style={{
                            fontSize: "16px",
                            color: "#374151",
                            lineHeight: "1.75"
                        }}>
                            Welcome to Naat Collection. We respect your privacy and are committed to
                            protecting your personal data. This privacy policy explains how we
                            handle your information when you use our mobile application.
                        </p>
                    </section>

                    <section>
                        <h2 style={{
                            fontSize: "24px",
                            fontWeight: "600",
                            color: "#111827",
                            marginBottom: "12px"
                        }}>
                            2. Information We Collect
                        </h2>
                        <p style={{
                            fontSize: "16px",
                            color: "#374151",
                            lineHeight: "1.75",
                            marginBottom: "8px"
                        }}>
                            Naat Collection is designed with privacy in mind. We collect minimal
                            information:
                        </p>
                        <ul style={{
                            marginLeft: "24px",
                            fontSize: "16px",
                            color: "#374151",
                            lineHeight: "1.75"
                        }}>
                            <li>App usage data (which features you use)</li>
                            <li>Audio and video playback history (stored locally on your device)</li>
                            <li>Downloaded content (stored locally on your device)</li>
                            <li>App preferences and settings (stored locally on your device)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 style={{
                            fontSize: "24px",
                            fontWeight: "600",
                            color: "#111827",
                            marginBottom: "12px"
                        }}>
                            3. How We Use Your Information
                        </h2>
                        <p style={{
                            fontSize: "16px",
                            color: "#374151",
                            lineHeight: "1.75",
                            marginBottom: "8px"
                        }}>
                            We use the collected information to:
                        </p>
                        <ul style={{
                            marginLeft: "24px",
                            fontSize: "16px",
                            color: "#374151",
                            lineHeight: "1.75"
                        }}>
                            <li>Provide and maintain our service</li>
                            <li>Remember your playback history and preferences</li>
                            <li>Improve app performance and user experience</li>
                            <li>Provide offline listening and viewing through downloaded content</li>
                        </ul>
                    </section>

                    <section>
                        <h2 style={{
                            fontSize: "24px",
                            fontWeight: "600",
                            color: "#111827",
                            marginBottom: "12px"
                        }}>
                            4. Data Storage
                        </h2>
                        <p style={{
                            fontSize: "16px",
                            color: "#374151",
                            lineHeight: "1.75"
                        }}>
                            All your personal data, including playback history, preferences, and
                            downloaded content, are stored locally on your device. We do not
                            transmit or store this information on external servers.
                        </p>
                    </section>

                    <section>
                        <h2 style={{
                            fontSize: "24px",
                            fontWeight: "600",
                            color: "#111827",
                            marginBottom: "12px"
                        }}>
                            5. Third-Party Services
                        </h2>
                        <p style={{
                            fontSize: "16px",
                            color: "#374151",
                            lineHeight: "1.75",
                            marginBottom: "8px"
                        }}>
                            Our app may use third-party services that may collect information:
                        </p>
                        <ul style={{
                            marginLeft: "24px",
                            fontSize: "16px",
                            color: "#374151",
                            lineHeight: "1.75"
                        }}>
                            <li>Audio and video streaming services for live radio</li>
                            <li>Cloud storage for content delivery</li>
                            <li>YouTube for video content</li>
                        </ul>
                    </section>

                    <section>
                        <h2 style={{
                            fontSize: "24px",
                            fontWeight: "600",
                            color: "#111827",
                            marginBottom: "12px"
                        }}>
                            6. Data Security
                        </h2>
                        <p style={{
                            fontSize: "16px",
                            color: "#374151",
                            lineHeight: "1.75"
                        }}>
                            We implement appropriate security measures to protect your
                            information. However, no method of transmission over the internet or
                            electronic storage is 100% secure.
                        </p>
                    </section>

                    <section>
                        <h2 style={{
                            fontSize: "24px",
                            fontWeight: "600",
                            color: "#111827",
                            marginBottom: "12px"
                        }}>
                            7. Children's Privacy
                        </h2>
                        <p style={{
                            fontSize: "16px",
                            color: "#374151",
                            lineHeight: "1.75"
                        }}>
                            Our app is suitable for all ages. We do not knowingly collect
                            personal information from children. The app does not require account
                            creation or personal information submission.
                        </p>
                    </section>

                    <section>
                        <h2 style={{
                            fontSize: "24px",
                            fontWeight: "600",
                            color: "#111827",
                            marginBottom: "12px"
                        }}>
                            8. Your Rights
                        </h2>
                        <p style={{
                            fontSize: "16px",
                            color: "#374151",
                            lineHeight: "1.75",
                            marginBottom: "8px"
                        }}>
                            You have the right to:
                        </p>
                        <ul style={{
                            marginLeft: "24px",
                            fontSize: "16px",
                            color: "#374151",
                            lineHeight: "1.75"
                        }}>
                            <li>Access your data (stored locally on your device)</li>
                            <li>Delete your data by uninstalling the app or clearing app data</li>
                            <li>Opt-out of data collection by not using the app</li>
                        </ul>
                    </section>

                    <section>
                        <h2 style={{
                            fontSize: "24px",
                            fontWeight: "600",
                            color: "#111827",
                            marginBottom: "12px"
                        }}>
                            9. Changes to This Policy
                        </h2>
                        <p style={{
                            fontSize: "16px",
                            color: "#374151",
                            lineHeight: "1.75"
                        }}>
                            We may update this privacy policy from time to time. We will notify
                            you of any changes by posting the new privacy policy in the app and
                            updating the "Last updated" date.
                        </p>
                    </section>

                    <section>
                        <h2 style={{
                            fontSize: "24px",
                            fontWeight: "600",
                            color: "#111827",
                            marginBottom: "12px"
                        }}>
                            10. Contact Us
                        </h2>
                        <p style={{
                            fontSize: "16px",
                            color: "#374151",
                            lineHeight: "1.75"
                        }}>
                            If you have any questions about this privacy policy, please contact
                            us at:
                        </p>
                        <p style={{
                            fontSize: "16px",
                            color: "#374151",
                            lineHeight: "1.75",
                            marginTop: "8px"
                        }}>
                            Email: <a href="mailto:mdsahil1631@gmail.com" style={{ color: "#10b981", textDecoration: "none" }}>mdsahil1631@gmail.com</a>
                        </p>
                    </section>
                </div>

                <div style={{
                    marginTop: "48px",
                    paddingTop: "24px",
                    borderTop: "1px solid #E5E7EB",
                    textAlign: "center"
                }}>
                    <p style={{
                        fontSize: "14px",
                        color: "#6B7280"
                    }}>
                        © {new Date().getFullYear()} Naat Collection. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
