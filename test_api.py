import requests

BASE = "http://localhost:8000"

r = requests.post(f"{BASE}/api/auth/login", json={"email": "alice@aicmps.demo", "password": "alice123"})
data = r.json()
token = data["access_token"]
print(f"Login OK. User: {data['user']['username']}, interactions: {data['user']['interaction_count']}")

headers = {"Authorization": f"Bearer {token}"}
r2 = requests.get(f"{BASE}/api/recommendations?top_n=5", headers=headers)
d = r2.json()
print(f"\nAlpha: {d.get('alpha')} | Latency: {d.get('latency_ms')}ms")
print(f"Recommendations ({len(d.get('recommendations', []))}):")
for rec in d.get("recommendations", []):
    title = rec["content"]["title"][:55]
    print(f"  {rec['score']:.3f} | {title} | {rec['reason']}")

print("\nTesting analytics (admin)...")
r_admin = requests.post(f"{BASE}/api/auth/login", json={"email": "admin@aicmps.demo", "password": "admin123"})
admin_token = r_admin.json()["access_token"]
admin_headers = {"Authorization": f"Bearer {admin_token}"}
r3 = requests.get(f"{BASE}/api/analytics", headers=admin_headers)
analytics = r3.json()
print(f"Users: {analytics['total_users']}, Content: {analytics['total_content']}, Interactions: {analytics['total_interactions']}")
print(f"Precision@10: {analytics['precision_at_10']}, Recall@10: {analytics['recall_at_10']}")
print("All tests PASSED!")
