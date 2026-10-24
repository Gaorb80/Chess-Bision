from chessbision.ky_hieu import dong_nuoc, san


def test_doi_ky_hieu_viet():
    assert san("Ra8#") == "Xa8#"
    assert san("Nxf7+") == "Mxf7+"
    assert san("Bb5") == "Tb5"
    assert san("bxc3") == "bxc3"          # tốt cột b, không phải Tượng
    assert san("exd8=Q+") == "exd8=H+"
    assert san("O-O-O") == "O-O-O"
    assert san("Ra8#", "quoc-te") == "Ra8#"


def test_danh_so_tu_1():
    assert dong_nuoc(["Qg8+", "Rxg8", "Nf7#"], "white") == "1. Hg8+ Xxg8 2. Mf7#"
    assert dong_nuoc(["Qh2+", "Kf1", "Qf2#"], "black") == "1... Hh2+ 2. Vf1 Hf2#"
