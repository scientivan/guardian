import { describe, expect, it } from "vitest";
import { amount, check, documentFile, email, httpsUrl, memberName, orgName, personName, phone, urlList } from "./validate";

describe("field rules", () => {
  it("person names: required, no digits, letters from any language", () => {
    expect(personName("the patient’s name")("  ")).toBe("Enter the patient’s name.");
    expect(personName()("Joko 2")).toBe("A name can’t contain numbers.");
    expect(personName()("Joko@")).toMatch(/letters only/);
    expect(personName()("J")).toMatch(/too short/);
    for (const ok of ["Joko", "Siti Nur'aini", "Jean-Luc O’Neil", "张伟", "Nguyễn Văn A"]) expect(personName()(ok)).toBeNull();
  });
  it("helper names allow groups, hospital names allow digits but need letters", () => {
    expect(memberName()("Masjid community fund (Jakarta)")).toBeNull();
    expect(memberName()("Fund 2")).toMatch(/numbers/);
    expect(orgName()("Hospital 101")).toBeNull();
    expect(orgName()("12345")).toMatch(/needs letters/);
  });
  it("email, phone and https addresses", () => {
    expect(email()("name@gmail")).toMatch(/valid email/);
    expect(email()("name@gmail.com")).toBeNull();
    expect(phone()("+62 812-3456-7890")).toBeNull();
    expect(phone()("call me")).toMatch(/letters/);
    expect(httpsUrl()("http://hospital.example")).toMatch(/https/);
    expect(urlList()("https://a.example\nnot a url")).toBe("Line 2 is not a valid https:// address.");
  });
  it("amounts: digits with two decimals, within limits", () => {
    expect(amount()("")).toBe("Enter an amount.");
    expect(amount()("12,5")).toMatch(/numbers only/);
    expect(amount()("0")).toMatch(/at least/);
    expect(amount("x", { max: 100 })("150")).toMatch(/more than 100/);
    expect(amount("x", { min: 0 })("0")).toBeNull();
  });
  it("document files and the check helper", () => {
    expect(documentFile({ name: "a.heic", type: "image/heic", size: 10 })).toMatch(/PDF, PNG or JPEG/);
    expect(documentFile({ name: "a.pdf", type: "application/pdf", size: 11 * 1024 * 1024 })).toMatch(/10 MB/);
    expect(check({ a: "", b: "Joko" }, { a: personName(), b: personName() })).toEqual({ a: "Enter the name." });
  });
});
