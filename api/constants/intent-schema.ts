export interface IntentClass {
  id: string;
  label: string;
  description: string;
  subclasses: string[];
}

export const INTENT_CLASSES: IntentClass[] = [
  // -----------------------------------------------------
  // 1. SECURITY INTENT
  // -----------------------------------------------------
  {
    id: "security",
    label: "Security Intent",
    description:
      "Detection and monitoring of threats, unauthorized access, malware, data breaches, attacks, policy violations, or any event that may compromise integrity, confidentiality, or availability.",
    subclasses: [
      // Access Control / Authentication
      "Unauthorized Access",
      "Failed Login Monitoring",
      "Brute Force Attack Detection",
      "Privilege Escalation Detection",
      "Insider Threat Detection",

      // Threat / Attack Detection
      "Intrusion Detection",
      "Suspicious Activity Detection",
      "Advanced Persistent Threat (APT) Detection",
      "SQL Injection Detection",
      "XSS / Web Attack Detection",
      "Command Injection Detection",

      // Malware / Ransomware
      "Malware Detection",
      "Ransomware Indicators",
      "Malicious File Behavior Detection",

      // Network & System Threats
      "Port Scan Detection",
      "DDoS / DoS Attack Detection",
      "Suspicious Network Traffic",
      "Firewall Policy Violation Detection",

      // Data Security
      "Data Exfiltration Detection",
      "Sensitive Data Access Monitoring",
      "Unencrypted Data Transfer Detection"
    ]
  },

  // -----------------------------------------------------
  // 2. PERFORMANCE INTENT
  // -----------------------------------------------------
  {
    id: "performance",
    label: "Performance Intent",
    description:
      "Monitoring system responsiveness, throughput, latency, resource usage, and performance degradation across applications, services, and infrastructure.",
    subclasses: [
      // System Resource Performance
      "CPU Utilization Monitoring",
      "Memory Utilization Monitoring",
      "Disk I/O Monitoring",

      // Application Performance
      "Response Time Monitoring",
      "Latency Monitoring",
      "Error Rate Analysis",
      "Throughput Analysis",
      "Service Degradation Detection",

      // Database Performance
      "Slow Query Detection",
      "Connection Pool Saturation",
      "Transaction Latency Monitoring",

      // Network Performance
      "Network Latency Monitoring",
      "Packet Loss Detection",
      "Bandwidth Monitoring",
      "Protocol Performance Analysis"
    ]
  },

  // -----------------------------------------------------
  // 3. AVAILABILITY & RELIABILITY
  // -----------------------------------------------------
  {
    id: "availability",
    label: "Availability & Reliability Intent",
    description:
      "Ensuring uptime, detecting service outages, monitoring reliability issues, and identifying conditions that may impact service continuity.",
    subclasses: [
      // Availability Monitoring
      "Service Uptime Tracking",
      "Downtime Detection (Planned/Unplanned)",
      "Service Outage Detection",

      // Reliability / Failure Conditions
      "Service Crash Detection",
      "Container/Pod CrashLoop Monitoring",
      "Node Failure Detection",
      "Hardware Failure Prediction",

      // Fault Tolerance & Redundancy
      "Failover Event Tracking",
      "Cluster Health Monitoring",
      "Load Balancer Health Detection",

      // Resilience Metrics
      "MTTR Monitoring",
      "MTBF Monitoring",
      "Service Degradation Trend Detection"
    ]
  },

  // -----------------------------------------------------
  // 4. COMPLIANCE & AUDIT
  // -----------------------------------------------------
  {
    id: "compliance",
    label: "Compliance & Audit Intent",
    description:
      "Monitoring of regulatory frameworks, audit trails, access governance, and policy enforcement. Ensures adherence to organizational and external compliance rules.",
    subclasses: [
      // Regulatory Compliance
      "HIPAA Compliance Monitoring",
      "GDPR Compliance Monitoring",
      "PCI-DSS Compliance Monitoring",
      "ISO 27001 Compliance Monitoring",

      // Audit Trail & Governance
      "User Activity Auditing",
      "Admin Action Auditing",
      "Data Access Auditing",
      "Configuration Change Auditing",

      // Policy Compliance
      "Password Policy Enforcement",
      "Access Policy Enforcement",
      "Data Retention Policy Monitoring",
      "Unauthorized Configuration Change Detection"
    ]
  },

  // -----------------------------------------------------
  // 5. USAGE & ANALYTICS
  // -----------------------------------------------------
  {
    id: "usage",
    label: "Usage & Analytics Intent",
    description:
      "Understanding patterns of usage, user behavior, resource consumption, trends, adoption rates, and feature usage within systems and applications.",
    subclasses: [
      // User Behavior
      "User Activity Patterns",
      "User Behavior Anomaly Detection",
      "Session Tracking",
      "User Journey Mapping",

      // Application Usage Analytics
      "API Usage Analytics",
      "Feature Usage Tracking",
      "Usage Heatmap Trends",
      "Endpoint Consumption Metrics",

      // System Usage Metrics
      "Bandwidth Consumption Analysis",
      "Storage Usage Trends",
      "Peak Usage Period Detection",

      // Business Analytics
      "Adoption Rate Monitoring",
      "Usage Forecasting",
      "Growth Trend Analysis"
    ]
  },

  // -----------------------------------------------------
  // 6. OPERATIONAL & INFRASTRUCTURE
  // -----------------------------------------------------
  {
    id: "operational",
    label: "Operational & Infrastructure Intent",
    description:
      "Monitoring health, configuration, capacity, resource availability, infrastructure performance, and system operations across physical and cloud environments.",
    subclasses: [
      // Infrastructure Health
      "Server Health Monitoring",
      "VM / Instance Health",
      "Container Health Monitoring",
      "Kubernetes Node Health",
      "Network Device Health Monitoring",

      // Capacity & Resource Planning
      "Capacity Forecasting",
      "Storage Capacity Planning",
      "Scaling Event Detection",
      "Auto-Scaling Behavior Analysis",

      // Configuration & Change Management
      "Patch Management Tracking",
      "Configuration Drift Detection",
      "Deployment Event Tracking",

      // Backup & Recovery
      "Backup Status Monitoring",
      "Recovery Success/Failure Tracking",
      "Disaster Recovery Validation"
    ]
  }
];

export const ANALYSIS_TECHNIQUES = [
  "Anomaly Detection",
  "Correlation Analysis",
  "Trend Analysis",
  "Pattern Matching",
  "Root Cause Analysis",
  "Time-Series Forecasting",
  "Behavioral Baseline Modeling",
  "Outlier Detection",
  "Clustering Analysis",
  "Threshold-Based Alerting"
];
