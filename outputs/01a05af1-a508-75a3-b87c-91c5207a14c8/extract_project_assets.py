import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path('/Users/project/MSSClaw')
OUT_DIR = ROOT / 'outputs' / '01a05af1-a508-75a3-b87c-91c5207a14c8'
DB_PATH = ROOT / 'apps' / 'api' / 'prisma' / 'dev.db'


def parse_json(value):
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return None


def main():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    workspaces = {
        row['id']: {
            'id': row['id'],
            'name': row['name'],
            'namespace': row['namespace'],
            'description': row['description'],
            'memberCount': row['memberCount'],
        }
        for row in con.execute(
            'select id, name, namespace, description, memberCount from Workspace order by id'
        )
    }

    marketplace = []
    center = []
    engagement = []
    for row in con.execute(
        "select workspaceId, id, kind, payload, updatedAt from CenterRecord "
        "where kind in ('marketplace', 'agent', 'skill') order by workspaceId, kind, id"
    ):
        payload = parse_json(row['payload'])
        if row['kind'] == 'marketplace':
            if not isinstance(payload, dict):
                continue
            for asset_kind in ('agents', 'skills'):
                values = payload.get(asset_kind)
                if not isinstance(values, list):
                    continue
                for item in values:
                    if isinstance(item, dict) and str(item.get('id', '')).strip():
                        marketplace.append({
                            'workspaceId': row['workspaceId'],
                            'workspaceName': workspaces.get(row['workspaceId'], {}).get('name', row['workspaceId']),
                            'kind': asset_kind[:-1],
                            'id': str(item['id']),
                            'recordUpdatedAt': row['updatedAt'],
                            'payload': item,
                        })
        elif isinstance(payload, dict):
            center.append({
                'workspaceId': row['workspaceId'],
                'workspaceName': workspaces.get(row['workspaceId'], {}).get('name', row['workspaceId']),
                'kind': row['kind'],
                'id': row['id'],
                'recordUpdatedAt': row['updatedAt'],
                'payload': payload,
            })
    for row in con.execute(
        'select workspaceId, contentId, views, uses, likes, dislikes, downloads, favorites, updatedAt '
        'from MarketEngagement order by workspaceId, contentId'
    ):
        engagement.append(dict(row))
    con.close()

    result = {
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'projectRoot': str(ROOT),
        'databasePath': str(DB_PATH),
        'workspaces': list(workspaces.values()),
        'marketplace': marketplace,
        'center': center,
        'engagement': engagement,
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / 'db-assets.json').write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8'
    )
    print(json.dumps({
        'workspaces': len(workspaces),
        'marketplace': len(marketplace),
        'center': len(center),
        'engagement': len(engagement),
        'output': str(OUT_DIR / 'db-assets.json'),
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
