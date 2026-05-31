# Freeform room — design spec (2026-05-31)

Owner chose **free placement** over slots for the room (My Room). Avatar stays
slot-based (one hair/outfit/etc — correct there). Room furniture/decor becomes
"place any item, any count, anywhere".

## Scope split
- **Avatar** (`item_type='avatar'`): keep slots + `user_room_equips`. Untouched.
- **Room shell**: wall colour + floor type stay single settings (keep the
  `wall` / `floor` rows in `user_room_equips`, or move to a settings row).
- **Room furniture/decor** (`item_type='room'`, excluding `wall`/`floor`):
  freeform **placed instances** (N per user).

## Data model
New table `user_room_placed`:
| col | type | note |
|---|---|---|
| id | UUID PK | |
| user_id | FK users CASCADE | |
| item_id | FK room_items(id) ON DELETE CASCADE | retired item → placements vanish |
| x, y, z | float | ROOM voxel grid (0..14; ×VOX 0.4 at render), same space as SLOT_PLACEMENT |
| rot | float | degrees |
| scale | float default 1.0 | for .vox items / overrides |
| created_at | ts | stable z-order |

`room_items` keeps `slot` only as a loose shop **category/group** now (no
one-per-slot constraint for room items). Avatar still uses it as a real slot.

## API (additive — old equip/layout kept for avatar + wall/floor)
- `GET /room/state` → wallet, catalog, **placed[]**, equipped (avatar + wall/floor).
- `POST /room/placed` {item_id,x,y,z,rot,scale} → instance (validates owned/affordable).
- `PATCH /room/placed/{id}` {x,y,z,rot,scale} → move/rotate/scale.
- `DELETE /room/placed/{id}` → remove.

## Migration
1. Create `user_room_placed` (additive, safe).
2. Backfill: for each `user_room_equips` row in a ROOM furniture slot (not
   wall/floor/avatar_*) with item_id not null → insert a placed instance at
   `SLOT_PLACEMENT[slot] + offsets` (embed the placement map in the migration),
   then delete those equip rows. Wall/floor/avatar rows stay.
3. New users: seed default furniture as placed instances (the is_default room
   furniture at their slot base positions).

## Frontend
- `use-room-scene`: render the **placed[] list** (item_id → builder or .vox +
  transform) instead of per-slot. Avatar + shell unchanged.
- Edit mode: select instance (raycast), drag on floor, rotate, raise (y),
  scale, delete; "add" from an inventory panel (catalog grid → click → drops a
  new instance at room centre, then drag).
- Shop/inventory: buy (unlock by XP) → adds a placeable instance. Multiple
  copies allowed.
- Retire `layout-dpad` per-slot mover; replace with select+drag.

## Imported models (the 5 tuned) ride this system
Once freeform lands, the 5 imported .vox become normal catalog rows
(item_type='room', render via VOX_ITEMS {url, scale}) placed as instances.
Cabinet world coords → voxel grid: ÷0.4.

## Phases
1. **Backend foundation** — ✅ DONE (2026-05-31). `UserRoomPlaced` model,
   migration `a3b4c5d6e7f8` (idempotent create-table), schemas
   (PlacedItem/Create/Update + `placed` on RoomState), service CRUD
   (add/update/delete + clamps + validation), router endpoints
   (POST/PATCH/DELETE `/room/placed`). 6 new tests, `test_room.py` 24/24 green.
2. **Backend seeding + migration** — ✅ DONE. Furniture defaults → placed
   instances (`_seed_default_placed`); settings/avatar stay equips
   (`_ensure_defaults_equipped` restricted); existing users self-heal via
   `_migrate_slot_furniture_to_placed` (slot furniture + offset → placed, lazy
   on next GET). `DEFAULT_PLACEMENTS` embeds the placement map. 3 more tests
   (seed / not-reseed / migrate). `test_room.py` 27/27.
3. **Frontend render** — ✅ DONE. `use-room-scene` rewritten: renders `placed[]`
   (code builders + .vox), reconcile diff in `setPlaced`. `RoomCanvas` drives it
   from `state.placed`; api/hooks add placed CRUD. tsc + lint green.
4. **Frontend edit** — ✅ DONE (engine). Raycast select, drag-on-floor with
   commit callback, selection ring; rotate/scale/raise/delete driven via
   re-render. Verified in `/room-dev` harness (mock state) — loads clean, no
   console errors. (Visual screenshot pending: preview screenshot tool wedged.)
5. **Wire 5 imported .vox** — ✅ DONE. Copied to `public/voxels/` (bookshelf,
   drawers, plant, monitor, keyboard); `VOX_ITEMS` maps id→url+tuned scale;
   backend catalog rows added (item_type=room, priced, not default). Asset
   serves 200, loads with no errors. One copy per item enforced (unique
   `(user_id,item_id)` constraint + idempotent add; test updated). 27/27.
6. **Swap RoomTab to freeform** — ✅ DONE. New `RoomEditor` (inventory + Walls/
   Floor tabs + selected control panel: move x/z, raise, rotate 45°, scale,
   delete). RoomTab renders it; old ShopPanel/layout-dpad no longer imported
   (left as dead code — delete in cleanup). Control scheme is BUTTON-driven
   per owner (click list→place+select; buttons move/rotate/scale; scene click =
   select; drag = orbit). tsc 0, lint 0, frontend 64/64.

Control scheme (owner-confirmed): one copy per item; buttons not drag.
Dev harness: `/room-dev` (mock freeform room, drives production RoomCanvas).

### Pending / follow-ups
- Live visual check of /achievements room tab (auth-gated — needs backend+login;
  the underlying RoomCanvas + controls are verified in /room-dev).
- Delete dead slot UI files (shop-panel, layout-dpad, shop-item-card, wallet-pill,
  item-preview, placement.ts) once confirmed unused.
- Optional: i18n keys for the 5 vox items (currently fall back to English name).
- Optional: auto-place the 5 imports at owner-tuned positions for new users.

### Note on transition
Phase 1 is additive + safe: `placed` defaults to `[]`, existing slot UI
untouched, no data migrated. The frontend still renders the old slot system.
Phases 2–4 are the cutover (render placed[], migrate defaults, retire slots) and
must land together so users never see double or empty rooms.
