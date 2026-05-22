import { invoke } from "@tauri-apps/api/core";

export async function saveDataset(payload) {
  return invoke("save_dataset", { payload });
}

export async function loadDataset() {
  return invoke("load_dataset");
}

export async function clearDataset() {
  return invoke("clear_dataset");
}

export async function datasetStatus() {
  return invoke("dataset_status");
}

export async function queryDataset(query) {
  return invoke("query_dataset", { query });
}

export async function getMetricCache(key) {
  return invoke("get_metric_cache", { key });
}

export async function setMetricCache(key, value) {
  return invoke("set_metric_cache", { key, value });
}
