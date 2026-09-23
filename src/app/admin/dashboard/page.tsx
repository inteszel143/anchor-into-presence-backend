export default function dashboard() {
  return (
    <>
      <div className="container">
        <div className="row">
          <div className="col-xl-12">
            <div className="row gx-4 gy-4">
              <div className="col-sm-6 col-md-4 col-xl-3">
                <div className="dash-num-info-cards">
                  <div className="dash-num-info-cards-header">
                    <div className="num-info-icon-box">
                      <i data-lucide="users" />
                    </div>
                    <div className="num-info-content-box">
                      <span className="num-values">45667</span>
                      <h2>Active Users</h2>
                    </div>
                  </div>
                  <div className="dash_progress_status">
                    <div className="d-flex justify-content-between align-items-center">
                      <h3 className="mb-0">Active Users</h3>
                      <div className="dashboard-card-stats">
                        <span className="dash-stats-icon">
                          <i data-lucide="trending-up" />
                        </span>
                        <p>
                          <span className="text-green-clr">8.5%</span> Up from
                          previous week
                        </p>
                      </div>
                    </div>
                    <div
                      className="progress"
                      role="progressbar"
                      aria-label="Success example"
                      aria-valuenow={75}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="progress-bar bg-green-clr"
                        style={{ width: "75%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-sm-6 col-md-4 col-xl-3">
                <div className="dash-num-info-cards">
                  <div className="dash-num-info-cards-header">
                    <div className="num-info-icon-box">
                      <i data-lucide="shield-alert" />
                    </div>
                    <div className="num-info-content-box">
                      <span className="num-values">65</span>
                      <h2>Safety Meetings</h2>
                    </div>
                  </div>
                  <div className="dash_progress_status">
                    <div className="d-flex justify-content-between align-items-center">
                      <h3 className="mb-0">Safety Meetings</h3>
                      <div className="dashboard-card-stats">
                        <span className="dash-stats-icon">
                          <i data-lucide="trending-down" />
                        </span>
                        <p>
                          <span className="text-red-clr">4.84%</span> Down from
                          yesterday
                        </p>
                      </div>
                    </div>
                    <div
                      className="progress"
                      role="progressbar"
                      aria-label="Success example"
                      aria-valuenow={25}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="progress-bar bg-red-clr"
                        style={{ width: "25%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="row mt-4">
          <div className="col-xl-12">
            <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 gx-sm-4 gx-lg-4 gy-4">
              <div className="col">
                <div className="dash-graph-cards-wrapper">
                  <div className="dash-graph-cards">
                    <div className="dash-graph-header">
                      <div className="dash-graph-title-flex">
                        <div className="dash-graph-icon-box">
                          <i data-lucide="Presentation" />
                        </div>
                        <div className="graph_card_info">
                          <h2>Total number of meetings</h2>
                        </div>
                      </div>
                      <div className="dash-graph-count">
                        <span className="dash-total-value">265</span>
                      </div>
                    </div>
                    <div className="graph-blk">
                      <div className="chart_blk">
                        <div id="timeline-chart-1" />
                      </div>
                      <div className="dashboard-card-stats">
                        <span className="dash-stats-icon">
                          <i data-lucide="trending-up" />
                        </span>
                        <p>
                          <span className="text-green-clr">8.5%</span> Up from
                          previous week
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="dash-graph-cards">
                    <div className="dash-graph-header">
                      <div className="dash-graph-title-flex">
                        <div className="dash-graph-icon-box">
                          <i data-lucide="Presentation" />
                        </div>
                        <div className="graph_card_info">
                          <h2>Today’s meeting</h2>
                        </div>
                      </div>
                      <div className="dash-graph-count">
                        <span className="dash-total-value">85</span>
                      </div>
                    </div>
                    <div className="graph-blk">
                      <div className="chart_blk">
                        <div id="timeline-chart-2" />
                      </div>
                      <div className="dashboard-card-stats">
                        <span className="dash-stats-icon">
                          <i data-lucide="trending-down" />
                        </span>
                        <p>
                          <span className="text-red-clr">8.5%</span> Up from
                          previous week
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col">
                <div className="dash-graph-cards-wrapper">
                  <div className="dash-graph-cards">
                    <div className="dash-graph-header">
                      <div className="dash-graph-title-flex">
                        <div className="dash-graph-icon-box">
                          <i data-lucide="file-search" />
                        </div>
                        <div className="graph_card_info">
                          <h2>Total number of inspection request</h2>
                        </div>
                      </div>
                      <div className="dash-graph-count">
                        <span className="dash-total-value">1265</span>
                      </div>
                    </div>
                    <div className="graph-blk">
                      <div className="chart_blk">
                        <div id="timeline-chart-3" />
                      </div>
                      <div className="dashboard-card-stats">
                        <span className="dash-stats-icon">
                          <i data-lucide="trending-up" />
                        </span>
                        <p>
                          <span className="text-green-clr">8.5%</span> Up from
                          previous week
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="dash-graph-cards">
                    <div className="dash-graph-header">
                      <div className="dash-graph-title-flex">
                        <div className="dash-graph-icon-box">
                          <i data-lucide="file-search" />
                        </div>
                        <div className="graph_card_info">
                          <h2>Weekly inspections</h2>
                        </div>
                      </div>
                      <div className="dash-graph-count">
                        <span className="dash-total-value">805</span>
                      </div>
                    </div>
                    <div className="graph-blk">
                      <div className="chart_blk">
                        <div id="timeline-chart-4" />
                      </div>
                      <div className="dashboard-card-stats">
                        <span className="dash-stats-icon">
                          <i data-lucide="trending-up" />
                        </span>
                        <p>
                          <span className="text-green-clr">8.5%</span> Up from
                          previous week
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col">
                <div className="dash-graph-cards-wrapper">
                  <div className="dash-graph-cards">
                    <div className="dash-graph-header">
                      <div className="dash-graph-title-flex">
                        <div className="dash-graph-icon-box">
                          <i className="hgi hgi-stroke hgi-installing-updates-02" />
                        </div>
                        <div className="graph_card_info">
                          <h2>Total number of installation</h2>
                        </div>
                      </div>
                      <div className="dash-graph-count">
                        <span className="dash-total-value">65</span>
                      </div>
                    </div>
                    <div className="graph-blk">
                      <div className="chart_blk">
                        <div id="timeline-chart-5" />
                      </div>
                      <div className="dashboard-card-stats">
                        <span className="dash-stats-icon">
                          <i data-lucide="trending-up" />
                        </span>
                        <p>
                          <span className="text-green-clr">8.5%</span> Up from
                          previous week
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="dash-graph-cards">
                    <div className="dash-graph-header">
                      <div className="dash-graph-title-flex">
                        <div className="dash-graph-icon-box">
                          <i className="hgi hgi-stroke hgi-installing-updates-02" />
                        </div>
                        <div className="graph_card_info">
                          <h2>Weekly installations</h2>
                        </div>
                      </div>
                      <div className="dash-graph-count">
                        <span className="dash-total-value">417</span>
                      </div>
                    </div>
                    <div className="graph-blk">
                      <div className="chart_blk">
                        <div id="timeline-chart-6" />
                      </div>
                      <div className="dashboard-card-stats">
                        <span className="dash-stats-icon">
                          <i data-lucide="trending-up" />
                        </span>
                        <p>
                          <span className="text-green-clr">8.5%</span> Up from
                          previous week
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
