import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Database,
  FlaskConical,
  Gauge,
  Info,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { analyticsApi } from "../api/client";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import StatCard from "../components/StatCard";

const CHART_COLORS = {
  ml: "#22d3ee",
  baseline: "#8b9cb6",
  importance: "#2dd4bf",
};

function metricPercent(value) {
  if (value === null || value === undefined) return "—";
  return `${(Number(value) * 100).toFixed(2)}%`;
}

function ConfusionMatrix({ title, matrix }) {
  if (!matrix) return null;
  return (
    <div className="confusion-block">
      <h4>{title}</h4>
      <div className="confusion-grid" aria-label={`${title} confusion matrix`}>
        <span />
        <span>Pred. incompatible</span>
        <span>Pred. compatible</span>
        <span>Actual incompatible</span>
        <strong>{matrix[0]?.[0] ?? "—"}</strong>
        <strong>{matrix[0]?.[1] ?? "—"}</strong>
        <span>Actual compatible</span>
        <strong>{matrix[1]?.[0] ?? "—"}</strong>
        <strong>{matrix[1]?.[1] ?? "—"}</strong>
      </div>
    </div>
  );
}

export default function MLAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await analyticsApi.mlMetrics();
      setData(payload);
    } catch (err) {
      setError(err.message || "ML metrics could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState label="Loading evaluation report..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const metrics = data?.metrics;
  const model = data?.model;
  const available = metrics?.available;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            <FlaskConical size={14} aria-hidden="true" />
            Experimental ML lab
          </span>
          <h2>Model evaluation and fallback</h2>
          <p>
            Actual results from the persisted Random Forest experiment, compared
            with the transparent weighted baseline.
          </p>
        </div>
        <span className={`badge ${model?.available ? "badge-violet" : "badge-soft"}`}>
          <BrainCircuit size={13} aria-hidden="true" />
          {model?.available ? "Model artifact loaded" : "Rule fallback active"}
        </span>
      </header>

      <div className="inline-notice inline-notice-warning">
        <ShieldAlert size={17} aria-hidden="true" />
        <span>
          <strong>Synthetic-label disclosure.</strong> The target is derived from
          documented compatibility rules, not observed passenger acceptance. High
          metrics validate implementation consistency, not real-world predictive
          performance.
        </span>
      </div>

      {!available ? (
        <>
          <div className="panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Evaluation report missing</span>
                <h2>The app is using the deterministic engine</h2>
              </div>
            </div>
            <p>
              {metrics?.reason ||
                "No evaluation artifact is available. Generate the dataset, train the model, and run evaluation to populate this page."}
            </p>
            <pre className="code-block">
{`python -m backend.ml.generate_dataset
python -m backend.ml.train_model
python -m backend.ml.evaluate_model`}
            </pre>
            <p className="field-hint">
              The matching application remains functional without this optional
              artifact. Missing ML artifacts never trigger training during an API
              request.
            </p>
          </div>
          <ModelStatusCard model={model} />
        </>
      ) : (
        <>
          <section className="stats-grid">
            <StatCard
              icon={Gauge}
              label="Precision"
              value={metricPercent(metrics.ml.precision)}
              hint="Synthetic test set"
              tone="teal"
            />
            <StatCard
              icon={Sparkles}
              label="Recall"
              value={metricPercent(metrics.ml.recall)}
              hint="Synthetic compatible labels"
              tone="accent"
            />
            <StatCard
              icon={CheckCircle2}
              label="F1 score"
              value={metricPercent(metrics.ml.f1)}
              hint="Random Forest"
              tone="violet"
            />
            <StatCard
              icon={Clock3}
              label="Mean inference"
              value={`${metrics.inference_latency?.mean_ms ?? "—"} ms`}
              hint="Single-row local timing"
              tone="warning"
            />
          </section>

          <div className="ml-grid">
            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">Model comparison</span>
                  <h2>Random Forest vs rule baseline</h2>
                </div>
                <span className="badge badge-soft">
                  {metrics.dataset?.test_rows} test pairs
                </span>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      {
                        metric: "Precision",
                        ML: metrics.ml.precision,
                        Baseline: metrics.rule_baseline.precision,
                      },
                      {
                        metric: "Recall",
                        ML: metrics.ml.recall,
                        Baseline: metrics.rule_baseline.recall,
                      },
                      {
                        metric: "F1",
                        ML: metrics.ml.f1,
                        Baseline: metrics.rule_baseline.f1,
                      },
                      {
                        metric: "Accuracy",
                        ML: metrics.ml.accuracy,
                        Baseline: metrics.rule_baseline.accuracy,
                      },
                    ]}
                    margin={{ top: 12, right: 16, bottom: 4, left: -16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#253348" />
                    <XAxis dataKey="metric" stroke="#8da4bf" tick={{ fontSize: 12 }} />
                    <YAxis
                      domain={[0, 1]}
                      stroke="#8da4bf"
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value) => metricPercent(value)}
                      contentStyle={{
                        background: "#0f2138",
                        border: "1px solid #2a3d57",
                        borderRadius: 12,
                        color: "#e6f1ff",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="ML" fill={CHART_COLORS.ml} radius={[5, 5, 0, 0]} />
                    <Bar
                      dataKey="Baseline"
                      fill={CHART_COLORS.baseline}
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="ml-note-grid">
                <div>
                  <span>ML Precision@5</span>
                  <strong>
                    {metricPercent(metrics.ml.precision_at_k?.mean_precision_at_k)}
                  </strong>
                </div>
                <div>
                  <span>Baseline Precision@5</span>
                  <strong>
                    {metricPercent(
                      metrics.rule_baseline.precision_at_k?.mean_precision_at_k
                    )}
                  </strong>
                </div>
                <div>
                  <span>Test scenarios</span>
                  <strong>{metrics.dataset?.test_groups}</strong>
                </div>
              </div>
            </section>

            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">Feature signal</span>
                  <h2>Random Forest importance</h2>
                </div>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={[...(metrics.model?.feature_importance || [])].reverse()}
                    layout="vertical"
                    margin={{ top: 8, right: 20, bottom: 4, left: 32 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#253348" />
                    <XAxis type="number" stroke="#8da4bf" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="feature"
                      width={132}
                      stroke="#8da4bf"
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value) => Number(value).toFixed(4)}
                      contentStyle={{
                        background: "#0f2138",
                        border: "1px solid #2a3d57",
                        borderRadius: 12,
                        color: "#e6f1ff",
                      }}
                    />
                    <Bar
                      dataKey="importance"
                      fill={CHART_COLORS.importance}
                      radius={[0, 5, 5, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="panel-note">
                Importance reflects this synthetic experiment only. It is not
                evidence of what drives real passenger preferences.
              </p>
            </section>
          </div>

          <div className="ml-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">Error analysis</span>
                  <h2>Confusion matrices</h2>
                </div>
              </div>
              <div className="confusion-pair">
                <ConfusionMatrix
                  title="Random Forest"
                  matrix={metrics.ml.confusion_matrix}
                />
                <ConfusionMatrix
                  title="Rule baseline"
                  matrix={metrics.rule_baseline.confusion_matrix}
                />
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">
                    <Database size={14} aria-hidden="true" />
                    Experiment context
                  </span>
                  <h2>Dataset and reproducibility</h2>
                </div>
              </div>
              <dl className="summary-list">
                <div>
                  <dt>Dataset pairs</dt>
                  <dd>{metrics.dataset?.rows}</dd>
                </div>
                <div>
                  <dt>Test pairs / scenarios</dt>
                  <dd>
                    {metrics.dataset?.test_rows} / {metrics.dataset?.test_groups}
                  </dd>
                </div>
                <div>
                  <dt>Group split</dt>
                  <dd>{metrics.reproducibility?.split}</dd>
                </div>
                <div>
                  <dt>Random seed</dt>
                  <dd>{metrics.reproducibility?.random_seed}</dd>
                </div>
                <div>
                  <dt>Generated</dt>
                  <dd>{new Date(metrics.generated_at_utc).toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Inference p95</dt>
                  <dd>{metrics.inference_latency?.p95_ms} ms</dd>
                </div>
              </dl>
              <p className="panel-note">{metrics.dataset?.target_description}</p>
            </section>
          </div>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">
                  <AlertTriangle size={14} aria-hidden="true" />
                  Required caveats
                </span>
                <h2>How to interpret these results</h2>
              </div>
            </div>
            <ul className="limitations-list">
              {metrics.limitations?.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
            <p className="panel-note">{data.notice}</p>
          </section>

          <ModelStatusCard model={model} />
        </>
      )}

      <div className="inline-notice inline-notice-info">
        <Info size={16} aria-hidden="true" />
        Eligibility is always enforced by deterministic rules first. Model output is
        displayed as experimental support and never overrides failed hard checks.
      </div>
    </div>
  );
}

function ModelStatusCard({ model }) {
  return (
    <section className="panel model-status-card">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">
            <BrainCircuit size={14} aria-hidden="true" />
            Runtime status
          </span>
          <h2>Serving and fallback</h2>
        </div>
        <span className={`badge ${model?.available ? "badge-success" : "badge-warning"}`}>
          {model?.available ? "Artifact available" : "Safe fallback"}
        </span>
      </div>
      <dl className="summary-list">
        <div>
          <dt>Mode</dt>
          <dd>{model?.mode}</dd>
        </div>
        <div>
          <dt>Artifact present</dt>
          <dd>{model?.artifact_present ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>Fallback reason</dt>
          <dd>{model?.fallback_reason || "Not required while the artifact loads."}</dd>
        </div>
        <div>
          <dt>Trained at</dt>
          <dd>
            {model?.metadata?.trained_at_utc
              ? new Date(model.metadata.trained_at_utc).toLocaleString()
              : "No training metadata"}
          </dd>
        </div>
      </dl>
      {model?.disclaimer && <p className="panel-note">{model.disclaimer}</p>}
    </section>
  );
}
