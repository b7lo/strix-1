/**
 * منتقيات نماذج مشتركة بنمط AuthField:
 *  - DateField: منتقي تاريخ native (بدل الكتابة اليدوية) يُخرج "YYYY-MM-DD".
 *  - SelectField: مودال اختيار مع بحث (للمدن مثلاً).
 */
import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultBirth(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 20);
  return d;
}

/** حقل تاريخ يفتح منتقياً native ويُخزّن القيمة بصيغة YYYY-MM-DD. */
export function DateField({
  label,
  value,
  onChange,
  placeholder,
  error,
  maximumDate,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  error?: string;
  maximumDate?: Date;
}) {
  const colors = useColors();
  const { rtl, t } = useLanguage();
  const [open, setOpen] = useState(false);

  const parsed = value ? new Date(value) : null;
  const valid = !!parsed && !Number.isNaN(parsed.getTime());
  const [temp, setTemp] = useState<Date>(valid ? (parsed as Date) : defaultBirth());

  const openPicker = () => {
    setTemp(valid ? (parsed as Date) : defaultBirth());
    setOpen(true);
  };

  const onAndroidChange = (e: DateTimePickerEvent, d?: Date) => {
    setOpen(false);
    if (e.type === "set" && d) onChange(toISO(d));
  };

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, { color: colors.foreground, textAlign: rtl.textAlign }]} weight="600">
        {label}
      </Text>
      <TouchableOpacity
        onPress={openPicker}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[
          styles.box,
          { backgroundColor: colors.card, borderColor: error ? colors.destructive : colors.border, flexDirection: rtl.flexDirection },
        ]}
      >
        <Feather name="calendar" size={18} color={colors.mutedForeground} />
        <Text style={[styles.boxText, { color: valid ? colors.foreground : colors.mutedForeground, textAlign: rtl.textAlign }]}>
          {valid ? value : placeholder || "YYYY-MM-DD"}
        </Text>
      </TouchableOpacity>
      {error ? <Text style={[styles.error, { color: colors.destructive, textAlign: rtl.textAlign }]}>{error}</Text> : null}

      {Platform.OS === "android" && open ? (
        <DateTimePicker value={temp} mode="date" display="default" maximumDate={maximumDate} onChange={onAndroidChange} />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
            <View style={[styles.sheet, { backgroundColor: colors.card }]}>
              <View style={[styles.sheetBar, { flexDirection: rtl.flexDirection }]}>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={() => { onChange(toISO(temp)); setOpen(false); }} accessibilityRole="button">
                  <Text style={{ color: colors.primary, fontSize: 16 }} weight="700">{t("auth.doneLabel")}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={temp}
                mode="date"
                display="spinner"
                maximumDate={maximumDate}
                onChange={(_e, d) => { if (d) setTemp(d); }}
                textColor={colors.foreground}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      ) : null}
    </View>
  );
}

export interface SelectOption {
  id: string;
  label: string;
}

/** حقل اختيار من قائمة عبر مودال مع بحث. */
export function SelectField({
  label,
  value,
  onSelect,
  placeholder,
  searchPlaceholder,
  error,
  options,
}: {
  label: string;
  value: string;
  onSelect: (id: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  error?: string;
  options: SelectOption[];
}) {
  const colors = useColors();
  const { rtl } = useLanguage();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.id === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [query, options]);

  const choose = (id: string) => {
    onSelect(id);
    setOpen(false);
    setQuery("");
  };

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, { color: colors.foreground, textAlign: rtl.textAlign }]} weight="600">
        {label}
      </Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[
          styles.box,
          { backgroundColor: colors.card, borderColor: error ? colors.destructive : colors.border, flexDirection: rtl.flexDirection },
        ]}
      >
        <Feather name="map-pin" size={18} color={colors.mutedForeground} />
        <Text style={[styles.boxText, { color: selected ? colors.foreground : colors.mutedForeground, textAlign: rtl.textAlign }]}>
          {selected ? selected.label : placeholder || ""}
        </Text>
        <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
      {error ? <Text style={[styles.error, { color: colors.destructive, textAlign: rtl.textAlign }]}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" onRequestClose={() => { setOpen(false); setQuery(""); }}>
        {/* شاشة كاملة: البحث بالأعلى والقائمة تملأ الباقي وترتفع فوق الكيبورد،
            مع إمكانية الاختيار والكيبورد مفتوح، وإغلاقه بسحب القائمة. */}
        <View style={[styles.modalRoot, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
          <View style={[styles.modalHeader, { flexDirection: rtl.flexDirection }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground, textAlign: rtl.textAlign }]} weight="700">
              {label}
            </Text>
            <TouchableOpacity onPress={() => { setOpen(false); setQuery(""); }} accessibilityRole="button" hitSlop={10}>
              <Feather name="x" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: rtl.flexDirection }]}>
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground, textAlign: rtl.textAlign, writingDirection: rtl.writingDirection }]}
              autoCorrect={false}
              autoFocus
              returnKeyType="search"
            />
          </View>

          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              style={styles.flex}
              contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
              renderItem={({ item }) => {
                const active = item.id === value;
                return (
                  <TouchableOpacity
                    onPress={() => choose(item.id)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[styles.option, { flexDirection: rtl.flexDirection, borderBottomColor: colors.border }]}
                  >
                    <Text style={[styles.optionText, { color: active ? colors.primary : colors.foreground, textAlign: rtl.textAlign }]} weight={active ? "700" : "400"}>
                      {item.label}
                    </Text>
                    {active ? <Feather name="check" size={18} color={colors.primary} /> : null}
                  </TouchableOpacity>
                );
              }}
            />
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { gap: 6 },
  label: { fontSize: 14 },
  box: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    alignItems: "center",
    gap: 10,
  },
  boxText: { flex: 1, fontSize: 16 },
  error: { fontSize: 12 },
  flex: { flex: 1 },
  modalRoot: { flex: 1, paddingHorizontal: 16 },
  modalHeader: { alignItems: "center", justifyContent: "space-between", paddingBottom: 12 },
  modalTitle: { flex: 1, fontSize: 20 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  sheetBar: { alignItems: "center", paddingVertical: 8 },
  listSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 10, maxHeight: "75%" },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  sheetTitle: { fontSize: 18, fontWeight: "800", textAlign: "center", marginBottom: 10 },
  searchBox: { alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 10 : 4 },
  searchInput: { flex: 1, fontSize: 16 },
  list: { marginTop: 8 },
  option: { alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  optionText: { flex: 1, fontSize: 16 },
  closeBtn: { alignItems: "center", paddingVertical: 10 },
});
