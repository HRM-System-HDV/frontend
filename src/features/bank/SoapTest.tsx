"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faPlay,
  faShieldHalved,
  faArrowsRotate,
  faCircleExclamation,
  faChevronDown,
  faChevronUp,
} from "@fortawesome/free-solid-svg-icons";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field } from "@/components/ui/Form";
import { postSoapPayroll } from "@/lib/api";
import type { SoapGatewayConfig } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  config: SoapGatewayConfig;
}

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <PayoutRequest>
      <idempotencyKey>KEY-TEST-001</idempotencyKey>
      <debitAccount>9704366666666666</debitAccount>
      <content>Chi lương tháng 10/2026</content>
      <totalAmount>50000000</totalAmount>
      <beneficiaryCount>10</beneficiaryCount>
    </PayoutRequest>
  </soap:Body>
</soap:Envelope>`;

function extractTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return m ? m[1] : null;
}

export default function SoapTestModal({ open, onClose, config }: Props) {
  const [xmlBody, setXmlBody] = useState(SAMPLE_XML);
  const [testing, setTesting] = useState(false);
  const [response, setResponse] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [lastMs, setLastMs] = useState<number | null>(null);

  const runTest = async () => {
    setTesting(true);
    setError(null);
    setResponse("");
    const t0 = Date.now();
    try {
      const text = await postSoapPayroll(xmlBody);
      setResponse(text);
      setLastMs(Date.now() - t0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi kiểm tra đường truyền.");
    } finally {
      setTesting(false);
    }
  };

  const isFault = response.includes("soap:Fault") || response.includes("<Fault>");
  const faultString = isFault ? extractTag(response, "faultstring") : null;
  const transactionId = extractTag(response, "transactionId");
  const bankReference = extractTag(response, "bankReference");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Kiểm tra Đường truyền Kết nối Ngân hàng (SOAP)"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="white" onClick={onClose} className="text-xs">
            Đóng
          </Button>
          <Button onClick={runTest} disabled={testing} className="text-xs">
            <FontAwesomeIcon
              icon={testing ? faArrowsRotate : faPlay}
              className={testing ? "animate-spin" : ""}
            />
            {testing ? "Đang gửi SOAP..." : "Gửi SOAP kiểm tra"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <FontAwesomeIcon icon={faCircleCheck} fontSize={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-900">
              Kịch bản demo SOAP
            </h4>
            <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
              Nhập đúng thông tin → trả <span className="font-mono font-bold">transactionId</span> +{" "}
              <span className="font-mono font-bold">bankReference</span>. Nhập số tiền vượt số dư →
              backend trả <span className="font-mono font-bold">soap:Fault faultstring=&quot;Số dư không đủ&quot;</span>.
            </p>
            {lastMs !== null && (
              <div className="mt-2 text-[11px] text-emerald-700">
                Phản hồi gần nhất: <strong>{lastMs}ms</strong>
              </div>
            )}
          </div>
        </div>

        <Field label="SOAP Envelope gửi đi (PayoutRequest)" required>
          <textarea
            value={xmlBody}
            onChange={(e) => setXmlBody(e.target.value)}
            disabled={testing}
            rows={11}
            spellCheck={false}
            className="w-full font-mono text-[11px] leading-relaxed bg-gray-950 text-gray-200 p-3 rounded-xl border border-gray-800 overflow-x-auto"
          />
        </Field>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
            <FontAwesomeIcon icon={faCircleExclamation} /> {error}
          </div>
        )}

        {response && (
          <div className="space-y-2">
            {!isFault && (transactionId || bankReference) ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                <div className="font-bold">Giao dịch SOAP thành công</div>
                {transactionId && <div>Mã giao dịch: <span className="font-mono font-bold">{transactionId}</span></div>}
                {bankReference && <div>Mã đối soát: <span className="font-mono font-bold">{bankReference}</span></div>}
              </div>
            ) : null}
            {isFault && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faCircleExclamation} /> Ngân hàng trả soap:Fault
                </div>
                {faultString && <div>faultstring: <span className="font-semibold">{faultString}</span></div>}
              </div>
            )}
            <div>
              <div className="text-[11px] font-bold text-gray-600 font-mono mb-1">XML phản hồi thô (raw):</div>
              <pre className="bg-gray-950 text-emerald-300 p-3 rounded-lg text-[11px] font-mono leading-relaxed overflow-x-auto max-h-64 border border-gray-800 whitespace-pre-wrap">
                {response}
              </pre>
            </div>
          </div>
        )}

        <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
          <button
            type="button"
            onClick={() => setShowTechDetails(!showTechDetails)}
            className="w-full px-4 py-2 flex items-center justify-between text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <FontAwesomeIcon icon={faShieldHalved} className="text-gray-400" />
              Chi tiết kỹ thuật (Dành cho Quản trị viên IT)
            </span>
            <FontAwesomeIcon icon={showTechDetails ? faChevronUp : faChevronDown} fontSize={12} />
          </button>
          {showTechDetails && (
            <div className="p-3 bg-white border-t border-gray-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">WSDL Endpoint:</span>
                <span className="font-mono text-gray-800">{config.wsdlUrl}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phương thức bảo mật:</span>
                <span className="text-gray-800">{config.securityMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tuyến SOAP:</span>
                <span className="font-mono text-gray-800">POST /soap/payroll (XML nguyên vẹn)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
